/**
 * AiFER Physics Laws Service v8
 * 
 * Implements the three fundamental physics laws that govern the AiFER mesh:
 * 
 * 🔬 PLANCK MODULE — Probabilistic AI Routing
 *    E = h·f — energy quantized per message
 *    Uses Planck's constant analog to assign "energy levels" to routes
 *    Higher energy → higher bandwidth priority
 * 
 * 🌈 WIEN MODULE — Peak Frequency Optimization
 *    λ_max · T = b (Wien's Displacement Law)
 *    Finds least-congested frequency band dynamically
 *    Reroutes traffic to "peak" efficiency frequencies
 * 
 * 🔥 STEFAN-BOLTZMANN MODULE — T⁴ Energy Scaling  
 *    P = σ · T⁴ — power scales with 4th power of temperature
 *    Mesh throughput scales with node "temperature" (activity)
 *    Hot mesh (many active peers) = exponentially more capacity
 */

// Physical constants (scaled for software use)
const PLANCK_H = 6.626e-34;           // Planck's constant
const WIEN_B = 2.897e-3;               // Wien's displacement constant
const STEFAN_SIGMA = 5.67e-8;          // Stefan-Boltzmann constant
const BOLTZMANN_K = 1.381e-23;         // Boltzmann constant

// Frequency bands AiFER supports (GHz → Hz)
const MESH_BANDS = {
  '2.4':  { hz: 2.4e9,  name: '2.4 GHz',  maxPeers: 50,  baseLatency: 15 },
  '5.0':  { hz: 5.0e9,  name: '5.0 GHz',  maxPeers: 30,  baseLatency: 8  },
  '5.4':  { hz: 5.4e9,  name: '5.4 GHz',  maxPeers: 25,  baseLatency: 7  },
  '5.7':  { hz: 5.7e9,  name: '5.7 GHz',  maxPeers: 20,  baseLatency: 6  },
  '6.0':  { hz: 6.0e9,  name: '6.0 GHz',  maxPeers: 15,  baseLatency: 5  },
  '7.1':  { hz: 7.1e9,  name: '7.1 GHz',  maxPeers: 10,  baseLatency: 4  },
};

// ═══════════════════════════════════════════════════════════
// PLANCK MODULE — Probabilistic AI routing with energy quanta
// ═══════════════════════════════════════════════════════════

class PlanckModule {
  constructor() {
    this.routeEnergies = new Map();  // routeId → energy level
    this.messageQuanta = [];          // Quantum packets in flight
  }

  /**
   * Calculate route "energy" based on frequency and peer state
   * E = h·f · reliability · (1 - congestion)
   */
  calculateRouteEnergy(frequency, reliability = 1.0, congestion = 0) {
    const freq = typeof frequency === 'string' ? MESH_BANDS[frequency]?.hz : frequency;
    if (!freq) return 0;
    
    // Energy in arbitrary units (normalized)
    const rawEnergy = PLANCK_H * freq;
    const scaled = (rawEnergy * 1e24);  // Scale to useful range
    
    return scaled * reliability * (1 - congestion);
  }

  /**
   * Probabilistic route selection via Boltzmann distribution
   * P(route) ∝ exp(E/kT)
   * Favors high-energy routes but keeps some randomness for exploration
   */
  selectRoute(candidateRoutes, temperature = 300) {
    if (!candidateRoutes.length) return null;
    
    const kT = BOLTZMANN_K * temperature * 1e24;  // Scaled
    
    // Calculate probabilities via Boltzmann factors
    const energies = candidateRoutes.map(r => r.energy || 0);
    const maxE = Math.max(...energies);
    const weights = energies.map(E => Math.exp((E - maxE) / kT));
    const sum = weights.reduce((a, b) => a + b, 0);
    const probabilities = weights.map(w => w / sum);
    
    // Weighted random selection
    let rand = Math.random();
    for (let i = 0; i < candidateRoutes.length; i++) {
      rand -= probabilities[i];
      if (rand <= 0) {
        return {
          ...candidateRoutes[i],
          probability: probabilities[i],
          selection: 'probabilistic',
        };
      }
    }
    return candidateRoutes[0];
  }

  /**
   * Quantize a message into energy packets
   * Larger messages split into multiple quanta for better mesh distribution
   */
  quantize(messageSize, frequency = '5.0') {
    const quantumSize = 4096;  // 4KB per quantum
    const numQuanta = Math.ceil(messageSize / quantumSize);
    const energyPerQuantum = this.calculateRouteEnergy(frequency);
    
    return {
      numQuanta,
      quantumSize,
      totalEnergy: numQuanta * energyPerQuantum,
      frequency,
    };
  }
}

// ═══════════════════════════════════════════════════════════
// WIEN MODULE — Peak frequency detection & adaptive bouncing
// ═══════════════════════════════════════════════════════════

class WienModule {
  constructor() {
    this.frequencyUsage = new Map();    // freq → current load (0-1)
    this.temperatureHistory = [];        // recent peer activity
    this.optimalFrequency = '5.0';      // Current peak
    
    // Initialize all bands
    Object.keys(MESH_BANDS).forEach(f => this.frequencyUsage.set(f, 0));
  }

  /**
   * Record activity on a frequency
   */
  recordActivity(frequency, bytesTransferred) {
    const current = this.frequencyUsage.get(frequency) || 0;
    const maxBytes = 1e7;  // 10MB reference load
    const newLoad = Math.min(1, current + (bytesTransferred / maxBytes));
    this.frequencyUsage.set(frequency, newLoad);
    
    // Decay over time — load reduces naturally
    setTimeout(() => {
      const now = this.frequencyUsage.get(frequency) || 0;
      this.frequencyUsage.set(frequency, Math.max(0, now * 0.9));
    }, 5000);
  }

  /**
   * Find peak frequency via Wien's Displacement Law
   * λ_max · T = b → optimal frequency for current "temperature"
   * In our analog: higher peer activity (T) → higher frequency preferred
   */
  findPeakFrequency(networkTemperature = 300) {
    // Wien's law gives us the peak wavelength
    // λ_peak = b / T
    // Converting to frequency: f_peak = c / λ_peak = (c · T) / b
    const c = 3e8;  // Speed of light
    const peakFreqHz = (c * networkTemperature) / WIEN_B;
    
    // Find nearest mesh band to peak
    let bestBand = '5.0';
    let bestScore = -Infinity;
    
    for (const [band, info] of Object.entries(MESH_BANDS)) {
      const load = this.frequencyUsage.get(band) || 0;
      const capacity = 1 - load;
      
      // Score combines Wien's peak with available capacity
      const distanceFromPeak = Math.abs(Math.log(info.hz / peakFreqHz));
      const wienScore = Math.exp(-distanceFromPeak);
      const combinedScore = wienScore * capacity * 0.7 + capacity * 0.3;
      
      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestBand = band;
      }
    }
    
    this.optimalFrequency = bestBand;
    return {
      band: bestBand,
      info: MESH_BANDS[bestBand],
      peakFreqHz,
      networkTemperature,
      score: bestScore,
    };
  }

  /**
   * Get frequency bouncing sequence — list of bands to hop through
   * Based on current loads, suggests an optimal hop pattern
   */
  getBounceSequence(count = 5) {
    const sorted = Array.from(this.frequencyUsage.entries())
      .sort((a, b) => a[1] - b[1])  // Least loaded first
      .slice(0, count)
      .map(([band]) => band);
    
    return sorted;
  }

  getLoadReport() {
    const report = {};
    this.frequencyUsage.forEach((load, band) => {
      report[band] = {
        load: load,
        percentage: (load * 100).toFixed(1),
        status: load > 0.8 ? 'congested' : load > 0.5 ? 'busy' : 'available',
      };
    });
    return report;
  }
}

// ═══════════════════════════════════════════════════════════
// STEFAN-BOLTZMANN MODULE — T⁴ scaling for network capacity
// ═══════════════════════════════════════════════════════════

class StefanModule {
  constructor() {
    this.peerTemperatures = new Map();   // peerId → activity "temperature"
    this.networkTemperature = 293;        // Starting at ~room temp (K)
    this.totalThroughput = 0;            // Bytes/sec
    this.capacityHistory = [];
  }

  /**
   * Update peer temperature based on recent activity
   * Active peers run "hotter"
   */
  updatePeerTemperature(peerId, messagesPerSecond = 0, bytesPerSecond = 0) {
    // Activity → temperature mapping
    const msgContribution = Math.log(1 + messagesPerSecond) * 30;
    const byteContribution = Math.log(1 + bytesPerSecond / 1000) * 20;
    const temperature = 273 + msgContribution + byteContribution;
    
    this.peerTemperatures.set(peerId, {
      T: temperature,
      lastUpdate: Date.now(),
      msgRate: messagesPerSecond,
      byteRate: bytesPerSecond,
    });
    
    this.recalculateNetworkTemperature();
    return temperature;
  }

  /**
   * Average peer temperatures into network temperature
   */
  recalculateNetworkTemperature() {
    if (this.peerTemperatures.size === 0) {
      this.networkTemperature = 293;
      return;
    }
    
    const temps = Array.from(this.peerTemperatures.values()).map(p => p.T);
    this.networkTemperature = temps.reduce((a, b) => a + b, 0) / temps.length;
  }

  /**
   * Calculate total network capacity via Stefan-Boltzmann Law
   * P = σ · T⁴
   * Capacity scales with 4th power of temperature
   */
  calculateCapacity() {
    const T = this.networkTemperature;
    const peerCount = this.peerTemperatures.size || 1;
    
    // Scaled Stefan-Boltzmann
    const basePower = STEFAN_SIGMA * Math.pow(T, 4);
    const scaled = basePower * 1e6;  // Scale to useful range
    
    // More peers = more surface area → more radiation
    const surfaceAreaFactor = Math.sqrt(peerCount);
    const totalCapacity = scaled * surfaceAreaFactor;
    
    // Store history
    this.capacityHistory.push({
      t: Date.now(),
      capacity: totalCapacity,
      temperature: T,
      peers: peerCount,
    });
    if (this.capacityHistory.length > 100) this.capacityHistory.shift();
    
    return {
      capacityBytesPerSec: totalCapacity,
      capacityReadable: this.formatBandwidth(totalCapacity),
      networkTemperature: T,
      peerCount,
      scaling: 'T⁴',
    };
  }

  formatBandwidth(bytesPerSec) {
    if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
    if (bytesPerSec < 1e6) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    if (bytesPerSec < 1e9) return `${(bytesPerSec / 1e6).toFixed(1)} MB/s`;
    return `${(bytesPerSec / 1e9).toFixed(2)} GB/s`;
  }

  /**
   * Prune old peer temperatures (if they haven't been active in 30s)
   */
  prune(maxAge = 30000) {
    const now = Date.now();
    for (const [id, data] of this.peerTemperatures) {
      if (now - data.lastUpdate > maxAge) {
        this.peerTemperatures.delete(id);
      }
    }
    this.recalculateNetworkTemperature();
  }
}

// ═══════════════════════════════════════════════════════════
// UNIFIED PHYSICS ENGINE — Combines all three modules
// ═══════════════════════════════════════════════════════════

class AiFERPhysicsEngine {
  constructor() {
    this.planck = new PlanckModule();
    this.wien = new WienModule();
    this.stefan = new StefanModule();
    this.listeners = new Set();
    
    // Background physics simulation
    this.pruneInterval = setInterval(() => this.stefan.prune(), 10000);
  }

  /**
   * Plan a message's route through the mesh using all three laws
   */
  planRoute(message, availablePeers = []) {
    // 1. Stefan-Boltzmann: what's the network's current capacity?
    const capacity = this.stefan.calculateCapacity();
    
    // 2. Wien: find peak frequency for current network temperature
    const peak = this.wien.findPeakFrequency(capacity.networkTemperature);
    
    // 3. Planck: select route probabilistically among available peers
    const messageSize = typeof message === 'string' 
      ? new Blob([message]).size 
      : (message.size || 1024);
    
    const quanta = this.planck.quantize(messageSize, peak.band);
    
    // Build route candidates from peers
    const candidates = availablePeers.map(peer => ({
      peerId: peer.id || peer.peerId,
      frequency: peak.band,
      energy: this.planck.calculateRouteEnergy(
        peak.band,
        peer.reliability || 0.9,
        this.wien.frequencyUsage.get(peak.band) || 0
      ),
      reliability: peer.reliability || 0.9,
    }));
    
    const selectedRoute = candidates.length 
      ? this.planck.selectRoute(candidates, capacity.networkTemperature)
      : null;
    
    // Record usage
    this.wien.recordActivity(peak.band, messageSize);
    
    const plan = {
      message: { size: messageSize, quanta },
      frequency: peak,
      route: selectedRoute,
      capacity: capacity,
      timestamp: Date.now(),
    };
    
    this.emit('routePlanned', plan);
    return plan;
  }

  /**
   * Get full physics state for HUD display
   */
  getState() {
    const capacity = this.stefan.calculateCapacity();
    const loads = this.wien.getLoadReport();
    const peak = this.wien.findPeakFrequency(capacity.networkTemperature);
    const bounceSeq = this.wien.getBounceSequence();
    
    return {
      planck: {
        activeQuanta: this.planck.messageQuanta.length,
        routes: this.planck.routeEnergies.size,
      },
      wien: {
        optimal: peak.band,
        peakFreqGHz: (peak.peakFreqHz / 1e9).toFixed(2),
        bounceSequence: bounceSeq,
        loads,
      },
      stefan: {
        networkTemp: capacity.networkTemperature.toFixed(1),
        peerCount: capacity.peerCount,
        capacity: capacity.capacityReadable,
        capacityRaw: capacity.capacityBytesPerSec,
      },
      history: this.stefan.capacityHistory.slice(-20),
    };
  }

  on(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  emit(event, data) {
    this.listeners.forEach(cb => {
      try { cb(event, data); } catch {}
    });
  }

  destroy() {
    clearInterval(this.pruneInterval);
    this.listeners.clear();
  }
}

export const physicsEngine = new AiFERPhysicsEngine();
export { PlanckModule, WienModule, StefanModule, MESH_BANDS, AiFERPhysicsEngine };
export default physicsEngine;
