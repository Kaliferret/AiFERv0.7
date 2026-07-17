/**
 * Mesh Dedup Service
 * 
 * Sprint 3: Hash-based dedup over mesh using bloom filters + DHT
 * 
 * Why?
 * If 50 peers have the same .aif file and peer 51 joins, we don't want
 * peer 51 to download from a central server. We want: detect which peers
 * already have it, download once from the closest one (physics-optimized).
 * 
 * How?
 * 1. Each peer maintains a bloom filter of CIDs they have locally
 * 2. Periodically gossip bloom filters (1-2KB compressed)
 * 3. When peer needs a CID, query mesh: "who has CID X?"
 * 4. DHT tracks CID→[peer_ids] mapping (Kademlia-style but simpler)
 * 5. Download from physics-optimal peer (low latency + low load)
 * 
 * Expected savings: 95%+ bandwidth for popular content
 */

// ═══════════════════════════════════════════════════════════
// BLOOM FILTER — probabilistic set membership
// ═══════════════════════════════════════════════════════════

class BloomFilter {
  constructor(size = 8192, numHashes = 4) {
    this.size = size;              // bit array size
    this.numHashes = numHashes;    // number of hash functions
    this.bits = new Uint8Array(Math.ceil(size / 8));
    this.count = 0;                 // approximate insertion count
  }

  // Simple hash function — FNV-1a variant
  hash(data, seed) {
    let h = 2166136261 ^ seed;
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    for (let i = 0; i < bytes.length; i++) {
      h ^= bytes[i];
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) % this.size;
  }

  add(item) {
    for (let i = 0; i < this.numHashes; i++) {
      const idx = this.hash(item, i);
      const byte = Math.floor(idx / 8);
      const bit = idx % 8;
      this.bits[byte] |= (1 << bit);
    }
    this.count++;
  }

  has(item) {
    for (let i = 0; i < this.numHashes; i++) {
      const idx = this.hash(item, i);
      const byte = Math.floor(idx / 8);
      const bit = idx % 8;
      if (!(this.bits[byte] & (1 << bit))) return false;
    }
    return true; // probabilistic — might be false positive
  }

  // Serialize to bytes for mesh transmission
  serialize() {
    const header = new Uint8Array(8);
    const dv = new DataView(header.buffer);
    dv.setUint32(0, this.size);
    dv.setUint16(4, this.numHashes);
    dv.setUint16(6, this.count);
    
    const result = new Uint8Array(header.length + this.bits.length);
    result.set(header, 0);
    result.set(this.bits, header.length);
    return result;
  }

  static deserialize(bytes) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, 8);
    const size = dv.getUint32(0);
    const numHashes = dv.getUint16(4);
    const count = dv.getUint16(6);
    
    const bf = new BloomFilter(size, numHashes);
    bf.bits = bytes.slice(8);
    bf.count = count;
    return bf;
  }

  // Estimated false positive rate
  falsePositiveRate() {
    return Math.pow(1 - Math.exp(-this.numHashes * this.count / this.size), this.numHashes);
  }

  clear() {
    this.bits.fill(0);
    this.count = 0;
  }
}

// ═══════════════════════════════════════════════════════════
// DHT — CID → [peer_ids] mapping (simplified Kademlia)
// ═══════════════════════════════════════════════════════════

class SimpleDHT {
  constructor() {
    this.table = new Map();         // cidHex → Set<peerId>
    this.peerContent = new Map();    // peerId → Set<cidHex>
    this.lastSeen = new Map();       // peerId → timestamp
  }

  register(cidHex, peerId) {
    if (!this.table.has(cidHex)) this.table.set(cidHex, new Set());
    this.table.get(cidHex).add(peerId);
    
    if (!this.peerContent.has(peerId)) this.peerContent.set(peerId, new Set());
    this.peerContent.get(peerId).add(cidHex);
    
    this.lastSeen.set(peerId, Date.now());
  }

  unregister(cidHex, peerId) {
    const peers = this.table.get(cidHex);
    if (peers) {
      peers.delete(peerId);
      if (peers.size === 0) this.table.delete(cidHex);
    }
    const content = this.peerContent.get(peerId);
    if (content) content.delete(cidHex);
  }

  findPeers(cidHex) {
    const peers = this.table.get(cidHex);
    return peers ? Array.from(peers) : [];
  }

  removePeer(peerId) {
    const content = this.peerContent.get(peerId);
    if (content) {
      for (const cidHex of content) {
        const peers = this.table.get(cidHex);
        if (peers) {
          peers.delete(peerId);
          if (peers.size === 0) this.table.delete(cidHex);
        }
      }
    }
    this.peerContent.delete(peerId);
    this.lastSeen.delete(peerId);
  }

  pruneStale(maxAgeMs = 300000) {
    const now = Date.now();
    for (const [peerId, ts] of this.lastSeen) {
      if (now - ts > maxAgeMs) this.removePeer(peerId);
    }
  }

  getStats() {
    return {
      uniqueCids: this.table.size,
      uniquePeers: this.peerContent.size,
      totalEntries: Array.from(this.table.values()).reduce((s, set) => s + set.size, 0),
    };
  }
}

// ═══════════════════════════════════════════════════════════
// MESH DEDUP SERVICE
// ═══════════════════════════════════════════════════════════

class MeshDedupService {
  constructor() {
    this.localBloom = new BloomFilter(8192, 4);
    this.peerBlooms = new Map();      // peerId → BloomFilter
    this.dht = new SimpleDHT();
    this.stats = {
      queriesServed: 0,
      queriesMade: 0,
      cacheHits: 0,
      cacheMisses: 0,
      bytesSaved: 0,
      bloomsExchanged: 0,
    };
    this.listeners = new Set();
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;
    this._initialized = true;

    try {
      // Load existing local bloom from persisted CIDs
      const { aifStorage } = await import('@/services/aif-runtime/aifFilesystem');
      const stored = aifStorage.files;
      for (const cidHex of stored.keys()) {
        this.localBloom.add(cidHex);
      }
      
      // Wire up mesh channels
      const { ferMesh } = await import('@/services/ferMeshService');
      
      ferMesh.on('meshDedup:bloom', (data) => this.handlePeerBloom(data));
      ferMesh.on('meshDedup:query', (data) => this.handleQuery(data));
      ferMesh.on('meshDedup:response', (data) => this.handleQueryResponse(data));
      
      // Periodic bloom gossip
      this.gossipInterval = setInterval(() => this.gossipBloom(), 30000);
      this.pruneInterval = setInterval(() => this.dht.pruneStale(), 60000);
      
      // Watch for new CIDs stored locally
      aifStorage.on('stored', ({ cid }) => {
        this.localBloom.add(cid);
        // Re-gossip eagerly if significant change
        if (this.localBloom.count % 10 === 0) this.gossipBloom();
      });
      
      console.info(`🫧 Mesh Dedup ready — ${this.localBloom.count} local CIDs`);
      this.emit('initialized');
    } catch (e) {
      console.warn('[MeshDedup] Init failed:', e.message);
    }
  }

  // ═══════════════════════════════════════════════
  // GOSSIP — share bloom filter with peers
  // ═══════════════════════════════════════════════

  async gossipBloom() {
    try {
      const { physicsEngine } = await import('@/services/physicsEngine');
      const state = physicsEngine.getState();
      // Only gossip during cool mesh
      const avgLoad = Object.values(state.wien.loads).reduce((s, l) => s + l.load, 0) / 6;
      if (avgLoad > 0.7) return;
      
      const { ferMesh } = await import('@/services/ferMeshService');
      if (!ferMesh.actions?.sendMeshDedup) return;
      
      const bytes = this.localBloom.serialize();
      const compressed = await this.compress(bytes);
      
      ferMesh.actions.sendMeshDedup({
        type: 'bloom',
        from: ferMesh.selfId,
        data: Array.from(compressed),
        originalSize: bytes.length,
        fpr: this.localBloom.falsePositiveRate(),
        count: this.localBloom.count,
        timestamp: Date.now(),
      });
      
      this.stats.bloomsExchanged++;
      this.emit('bloomGossiped', { size: compressed.length, count: this.localBloom.count });
    } catch (e) {
      console.warn('[MeshDedup] Gossip failed:', e.message);
    }
  }

  async handlePeerBloom(data) {
    try {
      const compressed = new Uint8Array(data.data);
      const bytes = await this.decompress(compressed);
      const bloom = BloomFilter.deserialize(bytes);
      
      this.peerBlooms.set(data.peerId, {
        bloom,
        receivedAt: Date.now(),
        count: data.count,
        fpr: data.fpr,
      });
      
      this.emit('peerBloomReceived', { peerId: data.peerId, count: data.count });
    } catch (e) {
      console.warn('[MeshDedup] Handle bloom failed:', e.message);
    }
  }

  // ═══════════════════════════════════════════════
  // QUERY — which peers have this CID?
  // ═══════════════════════════════════════════════

  /**
   * Find peers that likely have a CID.
   * First checks local DHT cache, then queries bloom filters,
   * then falls back to mesh query.
   */
  async findProviders(cidHex, options = {}) {
    this.stats.queriesMade++;
    
    // Check DHT first (fast, exact)
    let candidates = this.dht.findPeers(cidHex);
    if (candidates.length > 0) {
      this.stats.cacheHits++;
      return { peers: candidates, source: 'dht' };
    }
    
    // Check peer bloom filters (probabilistic)
    candidates = [];
    for (const [peerId, info] of this.peerBlooms) {
      if (info.bloom.has(cidHex)) {
        candidates.push({ peerId, fpr: info.fpr });
      }
    }
    
    if (candidates.length > 0) {
      return { peers: candidates.map(c => c.peerId), source: 'bloom', probabilistic: true };
    }
    
    // Fall back to explicit mesh query
    if (options.queryMesh !== false) {
      const peers = await this.queryMesh(cidHex, options.timeoutMs || 2000);
      if (peers.length > 0) {
        // Cache in DHT for next time
        peers.forEach(p => this.dht.register(cidHex, p));
        return { peers, source: 'mesh' };
      }
    }
    
    this.stats.cacheMisses++;
    return { peers: [], source: 'none' };
  }

  async queryMesh(cidHex, timeoutMs) {
    const { ferMesh } = await import('@/services/ferMeshService');
    if (!ferMesh.actions?.sendMeshDedup) return [];
    
    const queryId = `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const providers = [];
    
    return new Promise((resolve) => {
      const handler = (data) => {
        if (data.queryId === queryId && data.hasIt) {
          providers.push(data.peerId);
        }
      };
      
      const unsub = ferMesh.on('meshDedup:response', handler);
      
      ferMesh.actions.sendMeshDedup({
        type: 'query',
        queryId,
        cid: cidHex,
        from: ferMesh.selfId,
      });
      
      setTimeout(() => {
        unsub();
        resolve([...new Set(providers)]);
      }, timeoutMs);
    });
  }

  handleQuery({ queryId, cid, from, peerId }) {
    const responder = peerId || from;
    const hasIt = this.localBloom.has(cid);
    if (!hasIt) return; // silently ignore — don't spam negative responses
    
    // Register in own DHT that we know about this CID
    this.dht.register(cid, responder); // the asking peer might not have it, but record interest
    
    this.stats.queriesServed++;
    
    import('@/services/ferMeshService').then(({ ferMesh }) => {
      if (ferMesh.actions?.sendMeshDedup) {
        ferMesh.actions.sendMeshDedup({
          type: 'response',
          queryId,
          cid,
          hasIt: true,
          peerId: ferMesh.selfId,
        });
      }
    });
  }

  handleQueryResponse({ queryId, cid, peerId, hasIt }) {
    if (hasIt) {
      this.dht.register(cid, peerId);
      this.emit('providerFound', { cid, peerId });
    }
  }

  // ═══════════════════════════════════════════════
  // BEST PROVIDER SELECTION — physics-optimal peer
  // ═══════════════════════════════════════════════

  async selectBestProvider(cidHex) {
    const { peers } = await this.findProviders(cidHex);
    if (peers.length === 0) return null;
    
    try {
      const { physicsEngine } = await import('@/services/physicsEngine');
      // Use physics to select peer with best signal
      const state = physicsEngine.getState();
      // Simple: pick first (in real impl, use mesh peer latencies)
      return peers[0];
    } catch {
      return peers[0];
    }
  }

  // ═══════════════════════════════════════════════
  // COMPRESSION
  // ═══════════════════════════════════════════════

  async compress(bytes) {
    if (typeof CompressionStream === 'undefined') return bytes;
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
    const buffer = await new Response(stream).arrayBuffer();
    return new Uint8Array(buffer);
  }

  async decompress(bytes) {
    if (typeof DecompressionStream === 'undefined') return bytes;
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const buffer = await new Response(stream).arrayBuffer();
    return new Uint8Array(buffer);
  }

  // ═══════════════════════════════════════════════
  // STATS + EVENTS
  // ═══════════════════════════════════════════════

  getStats() {
    return {
      ...this.stats,
      localCount: this.localBloom.count,
      localFPR: this.localBloom.falsePositiveRate(),
      peerBlooms: this.peerBlooms.size,
      dht: this.dht.getStats(),
      hitRate: (this.stats.cacheHits + this.stats.cacheMisses) > 0 
        ? this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) : 0,
    };
  }

  on(event, cb) {
    const w = (e, d) => { if (e === event || event === '*') cb(e === event ? d : e, d); };
    this.listeners.add(w);
    return () => this.listeners.delete(w);
  }

  emit(event, data) {
    this.listeners.forEach(cb => { try { cb(event, data); } catch {} });
  }

  destroy() {
    if (this.gossipInterval) clearInterval(this.gossipInterval);
    if (this.pruneInterval) clearInterval(this.pruneInterval);
    this.listeners.clear();
  }
}

export const meshDedup = new MeshDedupService();
export { BloomFilter, SimpleDHT };
export default meshDedup;
