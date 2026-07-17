/**
 * Energy-Aware Scheduler
 * 
 * Central scheduler for all background tasks in AiFER. Decides WHEN tasks
 * run based on energy/network/mesh conditions, not just priority.
 * 
 * Priority tiers:
 *   CRITICAL: user-blocking, always runs immediately
 *   HIGH:     important, runs unless device is critically low
 *   NORMAL:   runs during idle (low mesh load, reasonable battery)
 *   LOW:      runs only when charging + wifi + cool mesh
 *   BACKGROUND: opportunistic, runs during full idle
 * 
 * Each registered task declares:
 *   - priority tier
 *   - estimated cost (cpu time, bytes)
 *   - min interval between runs
 *   - condition predicates (optional)
 * 
 * Scheduler runs tasks when conditions are favorable, respecting budgets.
 */

const PRIORITY = {
  CRITICAL: 5,
  HIGH: 4,
  NORMAL: 3,
  LOW: 2,
  BACKGROUND: 1,
};

class EnergyAwareScheduler {
  constructor() {
    this.tasks = new Map();            // id → task descriptor
    this.running = new Set();          // ids currently executing
    this.history = [];                  // last 100 runs
    this.stats = {
      totalRuns: 0,
      totalSkipped: 0,
      totalFailed: 0,
      byPriority: new Map(),
    };
    this.config = {
      tickIntervalMs: 3000,
      maxConcurrent: 3,
      criticalBatteryThreshold: 0.15,
      lowBatteryThreshold: 0.25,
      congestedMeshThreshold: 0.7,
    };
    this.listeners = new Set();
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;
    this._initialized = true;

    this.tickInterval = setInterval(() => this.tick(), this.config.tickIntervalMs);
    
    // Register built-in tasks
    await this.registerBuiltinTasks();
    
    console.info('⚡ Energy-Aware Scheduler ready');
    this.emit('initialized');
  }

  async registerBuiltinTasks() {
    // AiFER persona persistence
    this.register({
      id: 'persona-persist',
      name: 'Persona memory persist',
      priority: PRIORITY.LOW,
      minIntervalMs: 60000,
      estimatedCost: { cpuMs: 50, bytes: 1024 },
      run: async () => {
        const { aiferPersona } = await import('@/services/aiferPersonaService');
        await aiferPersona.persist();
      },
    });

    // LSTM model save
    this.register({
      id: 'lstm-save',
      name: 'LSTM model save',
      priority: PRIORITY.LOW,
      minIntervalMs: 5 * 60 * 1000,
      estimatedCost: { cpuMs: 200, bytes: 200000 },
      condition: async () => {
        const { lstmPredictor } = await import('@/services/lstmPredictionService');
        const status = lstmPredictor.getStatus();
        return status.initialized && status.stats.trainingSteps > 0;
      },
      run: async () => {
        const { lstmPredictor } = await import('@/services/lstmPredictionService');
        await lstmPredictor.saveToStorage();
      },
    });

    // Federated learning sync
    this.register({
      id: 'fed-sync',
      name: 'Federated learning sync',
      priority: PRIORITY.BACKGROUND,
      minIntervalMs: 5 * 60 * 1000,
      estimatedCost: { cpuMs: 150, bytes: 50000 },
      requiresCoolMesh: true,
      run: async () => {
        const { federatedLearning } = await import('@/services/federatedLearningService');
        await federatedLearning.attemptSync();
      },
    });

    // Mesh dedup gossip
    this.register({
      id: 'dedup-gossip',
      name: 'Bloom filter gossip',
      priority: PRIORITY.BACKGROUND,
      minIntervalMs: 30 * 1000,
      estimatedCost: { cpuMs: 80, bytes: 8192 },
      requiresCoolMesh: true,
      run: async () => {
        const { meshDedup } = await import('@/services/meshDedupService');
        await meshDedup.gossipBloom();
      },
    });
  }

  // ═══════════════════════════════════════════════
  // TASK REGISTRATION
  // ═══════════════════════════════════════════════

  register(task) {
    if (!task.id || !task.run) {
      throw new Error('Task must have id and run function');
    }
    const full = {
      ...task,
      priority: task.priority ?? PRIORITY.NORMAL,
      lastRunAt: 0,
      runCount: 0,
      failCount: 0,
      skipCount: 0,
      registeredAt: Date.now(),
    };
    this.tasks.set(task.id, full);
    this.emit('registered', full);
    return full;
  }

  unregister(id) {
    this.tasks.delete(id);
    this.emit('unregistered', { id });
  }

  // ═══════════════════════════════════════════════
  // CONDITION EVALUATION
  // ═══════════════════════════════════════════════

  async gatherConditions() {
    const { adaptiveCompression } = await import('@/services/adaptiveCompressionService');
    const { physicsEngine } = await import('@/services/physicsEngine').catch(() => ({}));
    
    let meshLoad = 0.5;
    let capacity = 1e6;
    if (physicsEngine) {
      try {
        const state = physicsEngine.getState();
        const loads = state.wien.loads;
        meshLoad = Object.values(loads).reduce((s, l) => s + l.load, 0) / 6;
        capacity = state.stefan.capacityRaw;
      } catch {}
    }
    
    const battery = adaptiveCompression.deviceState.battery;
    const charging = adaptiveCompression.deviceState.charging;
    const connection = adaptiveCompression.deviceState.connection;
    
    return {
      battery,
      charging,
      connection,
      wifiOrBetter: connection === 'wifi' || connection === '4g' || connection === '5g' || connection === 'unknown',
      meshLoad,
      meshCool: meshLoad < this.config.congestedMeshThreshold,
      capacity,
      isLowBattery: battery < this.config.lowBatteryThreshold && !charging,
      isCriticalBattery: battery < this.config.criticalBatteryThreshold && !charging,
    };
  }

  async shouldRun(task, conditions) {
    // Interval check
    if (task.lastRunAt > 0 && Date.now() - task.lastRunAt < task.minIntervalMs) {
      return { run: false, reason: 'min interval not reached' };
    }
    
    // Critical battery — only CRITICAL tasks
    if (conditions.isCriticalBattery && task.priority < PRIORITY.CRITICAL) {
      return { run: false, reason: 'critical battery' };
    }
    
    // Low battery — skip LOW and BACKGROUND
    if (conditions.isLowBattery && task.priority < PRIORITY.NORMAL) {
      return { run: false, reason: 'low battery' };
    }
    
    // Requires cool mesh
    if (task.requiresCoolMesh && !conditions.meshCool) {
      return { run: false, reason: 'mesh congested' };
    }
    
    // Requires wifi
    if (task.requiresWifi && !conditions.wifiOrBetter) {
      return { run: false, reason: 'not on wifi' };
    }
    
    // Custom condition
    if (task.condition) {
      try {
        const ok = await task.condition();
        if (!ok) return { run: false, reason: 'condition false' };
      } catch {
        return { run: false, reason: 'condition error' };
      }
    }
    
    return { run: true };
  }

  // ═══════════════════════════════════════════════
  // TICK — evaluates all tasks
  // ═══════════════════════════════════════════════

  async tick() {
    const conditions = await this.gatherConditions();
    
    // Skip entirely if device is very low
    if (conditions.isCriticalBattery) {
      this.emit('skippedTick', { reason: 'critical battery' });
      return;
    }
    
    // Collect runnable tasks sorted by priority
    const candidates = [];
    for (const task of this.tasks.values()) {
      if (this.running.has(task.id)) continue;
      const decision = await this.shouldRun(task, conditions);
      if (decision.run) {
        candidates.push(task);
      } else {
        task.skipCount++;
        this.stats.totalSkipped++;
      }
    }
    
    candidates.sort((a, b) => b.priority - a.priority);
    
    // Run up to maxConcurrent
    const slotsAvailable = this.config.maxConcurrent - this.running.size;
    for (const task of candidates.slice(0, slotsAvailable)) {
      this.runTask(task);
    }
  }

  async runTask(task) {
    this.running.add(task.id);
    const startAt = Date.now();
    
    try {
      this.emit('taskStart', { id: task.id, priority: task.priority });
      const result = await task.run();
      
      task.lastRunAt = Date.now();
      task.runCount++;
      this.stats.totalRuns++;
      
      const pCount = this.stats.byPriority.get(task.priority) || 0;
      this.stats.byPriority.set(task.priority, pCount + 1);
      
      this.history.push({
        id: task.id,
        priority: task.priority,
        elapsedMs: Date.now() - startAt,
        success: true,
        at: startAt,
      });
      if (this.history.length > 100) this.history.shift();
      
      this.emit('taskComplete', { id: task.id, result, elapsedMs: Date.now() - startAt });
    } catch (e) {
      task.failCount++;
      this.stats.totalFailed++;
      this.history.push({
        id: task.id,
        priority: task.priority,
        elapsedMs: Date.now() - startAt,
        success: false,
        error: e.message,
        at: startAt,
      });
      this.emit('taskFailed', { id: task.id, error: e.message });
    } finally {
      this.running.delete(task.id);
    }
  }

  // ═══════════════════════════════════════════════
  // STATS
  // ═══════════════════════════════════════════════

  getStats() {
    return {
      ...this.stats,
      byPriority: Array.from(this.stats.byPriority.entries()).map(([p, count]) => ({
        priority: ['', 'BACKGROUND', 'LOW', 'NORMAL', 'HIGH', 'CRITICAL'][p] || 'UNKNOWN',
        count,
      })),
      tasks: this.tasks.size,
      running: this.running.size,
      recentRuns: this.history.slice(-10).reverse(),
    };
  }

  getTaskList() {
    return Array.from(this.tasks.values()).map(t => ({
      id: t.id,
      name: t.name || t.id,
      priority: t.priority,
      priorityName: ['', 'BACKGROUND', 'LOW', 'NORMAL', 'HIGH', 'CRITICAL'][t.priority] || 'UNKNOWN',
      runCount: t.runCount,
      failCount: t.failCount,
      skipCount: t.skipCount,
      lastRunAt: t.lastRunAt,
      minIntervalMs: t.minIntervalMs,
    }));
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
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.listeners.clear();
  }
}

export const scheduler = new EnergyAwareScheduler();
export { PRIORITY };
export default scheduler;
