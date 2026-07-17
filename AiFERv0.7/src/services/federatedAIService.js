/**
 * Federated AI Service
 * 
 * Allows peers in the mesh to share their local AI compute.
 * When your device doesn't have Ollama but another peer does, 
 * route the prompt through the mesh → peer runs inference → returns response.
 * 
 * Uses the physics engine to route to the "hottest" (most capable) peer.
 */

class FederatedAIService {
  constructor() {
    this.isProviderMode = false;  // Am I offering compute?
    this.providerModels = [];      // Models I can serve
    this.activeRequests = new Map(); // reqId → {resolve, reject, timeout}
    this.peerCapabilities = new Map(); // peerId → {models, avgLatency, load}
    this.stats = {
      requestsServed: 0,
      requestsSent: 0,
      totalTokens: 0,
      avgLatency: 0,
    };
    this.listeners = new Set();
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;
    this._initialized = true;

    // Register mesh actions for federated AI
    try {
      const { ferMesh } = await import('@/services/ferMeshService');
      
      // Listen for incoming inference requests
      ferMesh.on('federatedAI:request', async (data) => {
        if (!this.isProviderMode) return;
        await this.handleProviderRequest(data);
      });

      // Listen for responses to our requests
      ferMesh.on('federatedAI:response', (data) => {
        this.handleResponse(data);
      });

      // Listen for capability announcements
      ferMesh.on('federatedAI:announce', (data) => {
        this.peerCapabilities.set(data.peerId, {
          models: data.models,
          avgLatency: data.avgLatency || 1000,
          load: data.load || 0,
          lastSeen: Date.now(),
        });
        this.emit('capabilitiesUpdated', this.peerCapabilities);
      });

      // Auto-detect if we can be a provider (Ollama available)
      await this.detectProviderCapabilities();
    } catch (e) {
      console.warn('[FederatedAI] Init failed:', e);
    }
  }

  // ═══ PROVIDER MODE ═══
  async detectProviderCapabilities() {
    try {
      const res = await fetch('http://localhost:11434/api/tags', {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        this.providerModels = (data.models || []).map(m => m.name);
        if (this.providerModels.length > 0) {
          this.isProviderMode = true;
          await this.announceCapabilities();
          console.info(`🤝 FederatedAI: Provider mode ON (${this.providerModels.length} models)`);
        }
      }
    } catch {}
  }

  async announceCapabilities() {
    try {
      const { ferMesh } = await import('@/services/ferMeshService');
      const { physicsEngine } = await import('@/services/physicsEngine');
      
      const state = physicsEngine.getState();
      
      if (ferMesh.actions?.sendFederatedAI) {
        ferMesh.actions.sendFederatedAI({
          type: 'announce',
          peerId: ferMesh.selfId,
          models: this.providerModels,
          avgLatency: this.stats.avgLatency || 500,
          load: this.activeRequests.size / 10, // 0-1 approx
          temperature: parseFloat(state.stefan.networkTemp),
        });
      }
    } catch {}
  }

  async handleProviderRequest({ reqId, prompt, model, from, options = {} }) {
    console.info(`🤝 FederatedAI: Serving request ${reqId} from ${from}`);
    const startTime = Date.now();
    
    try {
      // Check model availability
      const useModel = this.providerModels.find(m => m.startsWith(model)) || this.providerModels[0];
      if (!useModel) throw new Error('No models available');

      // Run inference via Ollama
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: useModel,
          prompt,
          stream: false,
          options: {
            temperature: options.temperature ?? 0.7,
            num_predict: options.max_tokens ?? 512,
          },
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
      const data = await response.json();
      
      const latency = Date.now() - startTime;
      this.stats.requestsServed++;
      this.stats.totalTokens += data.eval_count || 0;
      this.stats.avgLatency = (this.stats.avgLatency * 0.8) + (latency * 0.2);

      // Send response back via mesh
      const { ferMesh } = await import('@/services/ferMeshService');
      if (ferMesh.actions?.sendFederatedAI) {
        ferMesh.actions.sendFederatedAI({
          type: 'response',
          reqId,
          content: data.response,
          model: useModel,
          tokens: data.eval_count,
          latency,
          provider: ferMesh.selfId,
        });
      }

      this.emit('served', { reqId, from, latency, tokens: data.eval_count });
    } catch (err) {
      // Send error response
      const { ferMesh } = await import('@/services/ferMeshService');
      if (ferMesh.actions?.sendFederatedAI) {
        ferMesh.actions.sendFederatedAI({
          type: 'response',
          reqId,
          error: err.message,
          provider: ferMesh.selfId,
        });
      }
    }
  }

  // ═══ CONSUMER MODE ═══
  async requestInference(prompt, options = {}) {
    // Find best peer via physics engine
    const peer = await this.selectBestPeer(options.model);
    if (!peer) {
      throw new Error('No peers with AI capabilities found');
    }

    const reqId = 'req-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.activeRequests.delete(reqId);
        reject(new Error('Federated AI timeout (60s)'));
      }, 60000);

      this.activeRequests.set(reqId, { resolve, reject, timeout, startTime: Date.now() });
      this.stats.requestsSent++;

      import('@/services/ferMeshService').then(({ ferMesh }) => {
        if (ferMesh.actions?.sendFederatedAI) {
          ferMesh.actions.sendFederatedAI({
            type: 'request',
            reqId,
            prompt,
            model: options.model || 'llama3',
            from: ferMesh.selfId,
            options,
            targetPeer: peer.peerId,
          });
        }
      });

      this.emit('requested', { reqId, peer, prompt: prompt.slice(0, 50) });
    });
  }

  handleResponse({ reqId, content, error, tokens, latency, provider }) {
    const pending = this.activeRequests.get(reqId);
    if (!pending) return;
    
    clearTimeout(pending.timeout);
    this.activeRequests.delete(reqId);
    
    if (error) {
      pending.reject(new Error(error));
    } else {
      pending.resolve({
        content,
        tier: 'federated',
        provider,
        tokens,
        latency,
        totalTime: Date.now() - pending.startTime,
      });
    }
    
    this.emit('received', { reqId, provider, success: !error });
  }

  async selectBestPeer(preferredModel = null) {
    // Filter stale peers (30s)
    const now = Date.now();
    const fresh = Array.from(this.peerCapabilities.entries())
      .filter(([_, cap]) => now - cap.lastSeen < 30000);

    if (!fresh.length) return null;

    // Use physics engine to select — low load + matching model preferred
    const { physicsEngine } = await import('@/services/physicsEngine');
    
    const candidates = fresh.map(([peerId, cap]) => ({
      peerId,
      models: cap.models,
      hasModel: preferredModel ? cap.models.some(m => m.startsWith(preferredModel)) : true,
      energy: physicsEngine.planck.calculateRouteEnergy('5.0', 1 - cap.load, cap.load),
      reliability: 1 - cap.load,
      avgLatency: cap.avgLatency,
    }));

    // Prefer peers with the requested model
    const withModel = candidates.filter(c => c.hasModel);
    const pool = withModel.length ? withModel : candidates;

    // Probabilistic selection via Planck
    return physicsEngine.planck.selectRoute(pool, 300);
  }

  // ═══ UTILITIES ═══
  getStatus() {
    return {
      isProvider: this.isProviderMode,
      providerModels: this.providerModels,
      peerCount: this.peerCapabilities.size,
      activeRequests: this.activeRequests.size,
      stats: { ...this.stats },
      peers: Array.from(this.peerCapabilities.entries()).map(([id, cap]) => ({
        peerId: id,
        ...cap,
      })),
    };
  }

  on(event, cb) {
    const wrapped = (e, data) => { if (e === event || event === '*') cb(e === event ? data : e, data); };
    this.listeners.add(wrapped);
    return () => this.listeners.delete(wrapped);
  }

  emit(event, data) {
    this.listeners.forEach(cb => { try { cb(event, data); } catch {} });
  }
}

export const federatedAI = new FederatedAIService();
export default federatedAI;
