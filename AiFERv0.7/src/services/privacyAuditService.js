/**
 * Privacy Audit Service
 * 
 * Automated review of what personal data is:
 * - Stored locally (mostly fine, user's own device)
 * - Shared over mesh (can leak to other peers)
 * - Sent to cloud AI (external parties)
 * - Persisted across sessions (long-lived fingerprint risk)
 * 
 * Generates a structured report with findings classified as:
 *   CRITICAL  - sensitive data exposed externally
 *   HIGH      - significant leak potential
 *   MEDIUM    - fixable with mitigation
 *   LOW       - informational
 *   OK        - no issue
 */

const SEVERITY = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  OK: 0,
};

class PrivacyAuditService {
  constructor() {
    this.findings = [];
    this.lastAuditAt = null;
    this.listeners = new Set();
  }

  async runFullAudit() {
    this.findings = [];
    
    await this.auditActionHistory();
    await this.auditPersonaMemory();
    await this.auditLSTMModel();
    await this.auditFederatedLearning();
    await this.auditSemanticCache();
    await this.auditSignedApps();
    await this.auditEncryption();
    await this.auditMeshBroadcast();
    await this.auditCloudAI();
    await this.auditLocalStorage();
    
    this.lastAuditAt = Date.now();
    this.emit('auditComplete', { findings: this.findings });
    return this.getReport();
  }

  addFinding(severity, area, title, detail, mitigation) {
    this.findings.push({
      id: `f-${Math.random().toString(36).slice(2, 8)}`,
      severity,
      severityScore: SEVERITY[severity],
      area,
      title,
      detail,
      mitigation,
      at: Date.now(),
    });
  }

  // ═══════════════════════════════════════════════
  // AUDIT CHECKS
  // ═══════════════════════════════════════════════

  async auditActionHistory() {
    try {
      const { predictivePrefetch } = await import('@/services/predictivePrefetchService');
      const stats = predictivePrefetch.getStats();
      
      if (stats.historySize > 0) {
        this.addFinding('LOW', 'Predictive Prefetch',
          'Action history stored locally',
          `${stats.historySize} recent actions in IndexedDB — device-local only, never transmitted`,
          'Already mitigated: actions stay on device. Can be cleared via prefetch.reset().');
      } else {
        this.addFinding('OK', 'Predictive Prefetch', 'No action history stored yet', '', '');
      }
    } catch {}
  }

  async auditPersonaMemory() {
    try {
      const { aiferPersona } = await import('@/services/aiferPersonaService');
      const state = aiferPersona.getState();
      
      if (state.memorySize.facts > 0 || state.memorySize.preferences > 0) {
        this.addFinding('MEDIUM', 'AiFER Persona',
          'Personal facts + preferences stored',
          `${state.memorySize.facts} facts, ${state.memorySize.preferences} preferences in IndexedDB. ` +
          'These can contain sensitive info (name, location, beliefs) if user shared such.',
          'Provide UI to view + delete individual facts. Warn user before storing sensitive info. Consider auto-expiry for facts older than N days.');
      } else {
        this.addFinding('OK', 'AiFER Persona', 'No persona memory stored', '', '');
      }
    } catch {}
  }

  async auditLSTMModel() {
    try {
      const { lstmPredictor } = await import('@/services/lstmPredictionService');
      const status = lstmPredictor.getStatus();
      
      if (status.vocabularySize > 0) {
        this.addFinding('MEDIUM', 'LSTM Model',
          'Model vocabulary contains action strings',
          `${status.vocabularySize} unique action IDs mapped to strings. Model weights themselves are opaque, but the vocabulary ` +
          'reveals which actions/features this user has accessed (e.g., "nav:MedicalRecords" would be identifiable).',
          'For federated sharing, consider stripping vocabulary or using hashed/anonymized action names. Only share weights, not vocab mappings.');
      } else {
        this.addFinding('OK', 'LSTM Model', 'No model trained yet', '', '');
      }
    } catch {}
  }

  async auditFederatedLearning() {
    try {
      const { federatedLearning } = await import('@/services/federatedLearningService');
      const status = federatedLearning.getStatus();
      
      if (status.enabled && !status.differentialPrivacy) {
        this.addFinding('HIGH', 'Federated Learning',
          'DP disabled — weights shared raw',
          `Model weights are gossiped to mesh peers. Without differential privacy noise, ` +
          'sophisticated attackers can potentially reconstruct individual training samples from weight updates.',
          'Enable differential privacy via federatedLearning.setDifferentialPrivacy(true). Accept ~1-2% accuracy loss for strong privacy guarantee.');
      } else if (status.enabled && status.differentialPrivacy) {
        this.addFinding('LOW', 'Federated Learning',
          'DP enabled — good',
          `Weights shared with Gaussian noise (scale=${federatedLearning.noiseScale}). Good privacy posture.`,
          'Already mitigated. Periodically verify noise scale hasn\'t been reduced.');
      } else {
        this.addFinding('OK', 'Federated Learning', 'Disabled', 'Not sharing any model data.', '');
      }
    } catch {}
  }

  async auditSemanticCache() {
    try {
      const { semanticCache } = await import('@/services/semanticCacheService');
      const stats = semanticCache.getStats();
      
      if (stats.size > 0) {
        this.addFinding('MEDIUM', 'Semantic Cache',
          'User queries + responses cached',
          `${stats.size} cached query/response pairs. This includes user input verbatim. TTL=30min. Device-local only.`,
          'Already local. Consider shorter TTL for sensitive topics (financial, medical). Provide clear-cache UI.');
      } else {
        this.addFinding('OK', 'Semantic Cache', 'Empty cache', '', '');
      }
    } catch {}
  }

  async auditSignedApps() {
    try {
      const { aifKeyManager } = await import('@/services/aif-runtime/aifCrypto');
      const status = aifKeyManager.getStatus();
      
      if (!status.publicKey) {
        this.addFinding('MEDIUM', 'App Signatures',
          'No signing key — apps not signed',
          'User cannot verify authorship of .aif apps they distribute. Installed apps cannot verify updates come from same author.',
          'Auto-generate keypair on first launch (aifKeyManager.init()). Key is device-local, never leaves.');
      } else {
        this.addFinding('LOW', 'App Signatures',
          'Public key is device-identifying',
          `Public key ${status.publicKey.slice(0, 16)}... acts as a stable identifier across signed apps — ` +
          'can be used to fingerprint this device/user across the mesh.',
          'Acceptable tradeoff for authenticity. If paranoid: rotate keys per app category. Document this clearly to users.');
      }
    } catch {}
  }

  async auditEncryption() {
    try {
      const { aifStorage } = await import('@/services/aif-runtime/aifFilesystem');
      const stats = aifStorage.getStats();
      
      this.addFinding('LOW', 'AIF Encryption',
        'Per-section encryption available',
        'AES-256-GCM supported for sensitive sections (state, user data). Keys derived from zkLogin — lost session = lost data.',
        'Consider backup seed phrase / recovery mechanism for encryption keys. Document clearly that section encryption requires persistent zkLogin session.');
    } catch {}
  }

  async auditMeshBroadcast() {
    try {
      const { ferMesh } = await import('@/services/ferMeshService');
      const meshStats = ferMesh.getStats ? ferMesh.getStats() : null;
      
      if (meshStats?.connected) {
        this.addFinding('MEDIUM', 'Mesh Broadcast',
          'Mesh traffic visible to all peers',
          `Connected to mesh with ${meshStats.peerCount || 0} peers. Messages broadcast on channels (fedAI, fedLearn, mDedup, aifPkg) are visible to ALL peers in same room. ` +
          'Even if content is encrypted, metadata (who talks to whom, when, how often) is visible.',
          'Use targeted peer messages (via WebRTC data channels) for sensitive exchanges. Consider onion routing for very sensitive traffic.');
      } else {
        this.addFinding('OK', 'Mesh Broadcast', 'Not connected to mesh', '', '');
      }
    } catch {}
  }

  async auditCloudAI() {
    try {
      const { aiRouter } = await import('@/services/aiRouterService');
      const stats = aiRouter.getStats ? aiRouter.getStats() : null;
      
      // Check if cloud tier has been used
      if (stats?.byTier?.cloud > 0) {
        this.addFinding('HIGH', 'Cloud AI',
          'Queries sent to cloud providers',
          `${stats.byTier.cloud} queries sent to Anthropic/OpenAI. User input + context left the device. ` +
          'Cloud providers may log queries, use them for training (depending on their policy), or be compelled to disclose.',
          'Prefer local Ollama when available. Route cloud-bound queries via privacy proxy. Warn user before sending sensitive context to cloud.');
      } else if (stats?.byTier?.local > 0 || stats?.byTier?.federated > 0) {
        this.addFinding('LOW', 'Cloud AI',
          'Using local/federated — good',
          `AI inference stayed on mesh (${stats.byTier.local || 0} local, ${stats.byTier.federated || 0} federated). No cloud exposure.`,
          'Already optimal. Maintain by keeping cloud tier as fallback only.');
      } else {
        this.addFinding('OK', 'Cloud AI', 'No AI queries made yet', '', '');
      }
    } catch {
      this.addFinding('LOW', 'Cloud AI',
        'Unable to check AI router stats',
        'Could not determine which tiers have been used.', '');
    }
  }

  async auditLocalStorage() {
    try {
      // Estimate IndexedDB usage
      let usageEstimate = 'unknown';
      if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
        const est = await navigator.storage.estimate();
        usageEstimate = `${((est.usage || 0) / 1024 / 1024).toFixed(2)}MB / ${((est.quota || 0) / 1024 / 1024).toFixed(0)}MB`;
      }
      
      this.addFinding('LOW', 'Local Storage',
        'Persistent local data',
        `IndexedDB storage: ${usageEstimate}. Includes: LSTM model, signing keypair, persona memory, semantic cache, mesh dedup index, action history.`,
        'Provide "Erase all AiFER data" button in settings. Document what is stored.');
    } catch {}
  }

  // ═══════════════════════════════════════════════
  // REPORT GENERATION
  // ═══════════════════════════════════════════════

  getReport() {
    const bySeverity = { CRITICAL: [], HIGH: [], MEDIUM: [], LOW: [], OK: [] };
    for (const f of this.findings) {
      bySeverity[f.severity].push(f);
    }
    
    const score = this.calculatePrivacyScore();
    
    return {
      runAt: this.lastAuditAt,
      totalFindings: this.findings.length,
      bySeverity: {
        critical: bySeverity.CRITICAL.length,
        high: bySeverity.HIGH.length,
        medium: bySeverity.MEDIUM.length,
        low: bySeverity.LOW.length,
        ok: bySeverity.OK.length,
      },
      findings: this.findings.slice().sort((a, b) => b.severityScore - a.severityScore),
      privacyScore: score,
      grade: this.scoreToGrade(score),
      summary: this.generateSummary(score, bySeverity),
    };
  }

  calculatePrivacyScore() {
    if (this.findings.length === 0) return 100;
    
    let deduction = 0;
    for (const f of this.findings) {
      switch (f.severity) {
        case 'CRITICAL': deduction += 25; break;
        case 'HIGH':     deduction += 10; break;
        case 'MEDIUM':   deduction += 3; break;
        case 'LOW':      deduction += 1; break;
        case 'OK':       break;
      }
    }
    
    return Math.max(0, 100 - deduction);
  }

  scoreToGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  generateSummary(score, bySeverity) {
    if (bySeverity.CRITICAL.length > 0) {
      return 'KRITIEKE privacy-problemen gevonden. Fix onmiddellijk.';
    }
    if (bySeverity.HIGH.length > 0) {
      return `${bySeverity.HIGH.length} hoge risico's — mitigatie aanbevolen voor productie.`;
    }
    if (score >= 80) {
      return 'Goede privacy posture. Enkele aandachtspunten, geen blockers.';
    }
    return 'Verbeterpunten — review findings en implementeer mitigaties.';
  }

  on(event, cb) {
    const w = (e, d) => { if (e === event || event === '*') cb(e === event ? d : e, d); };
    this.listeners.add(w);
    return () => this.listeners.delete(w);
  }

  emit(event, data) {
    this.listeners.forEach(cb => { try { cb(event, data); } catch {} });
  }
}

export const privacyAudit = new PrivacyAuditService();
export { SEVERITY };
export default privacyAudit;
