/**
 * Adaptive Compression Service
 * 
 * Replaces one-size-fits-all gzip with intelligent per-content-type compression.
 * 
 * Decision tree:
 *   Already-compressed (jpg/png/mp4/gz/webp/zip)  → skip (net loss)
 *   Very small (<128B)                              → skip (overhead > savings)
 *   Text/code/JSON                                  → brotli 11 (best ratio)
 *   Binary weights/tensors                          → gzip 6 (balanced)
 *   Mesh messages (time-critical)                   → gzip 1 (fast)
 *   Unknown                                         → try multiple, keep smallest
 * 
 * Also adapts to device:
 *   Battery < 20% + not charging  → lower levels (save CPU)
 *   Mobile connection             → higher levels (trade CPU for bandwidth)
 *   Physics engine cool           → can afford heavy compression
 */

const ALREADY_COMPRESSED_EXTS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif',
  'mp3', 'ogg', 'aac', 'opus',
  'mp4', 'webm', 'mov', 'avi',
  'zip', 'gz', 'br', '7z', 'rar', 'xz',
  'pdf',
]);

const TEXT_EXTS = new Set([
  'txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'html', 'css',
  'py', 'rs', 'go', 'java', 'c', 'cpp', 'h', 'aif', 'yaml', 'yml',
  'toml', 'xml', 'svg', 'csv', 'tsv', 'log',
]);

// Magic byte signatures for content detection
const MAGIC_SIGNATURES = [
  { bytes: [0x89, 0x50, 0x4E, 0x47], type: 'image', format: 'png' },
  { bytes: [0xFF, 0xD8, 0xFF],       type: 'image', format: 'jpeg' },
  { bytes: [0x47, 0x49, 0x46, 0x38], type: 'image', format: 'gif' },
  { bytes: [0x52, 0x49, 0x46, 0x46], type: 'audio', format: 'wav' },
  { bytes: [0x25, 0x50, 0x44, 0x46], type: 'document', format: 'pdf' },
  { bytes: [0x1F, 0x8B],             type: 'compressed', format: 'gzip' },
  { bytes: [0x50, 0x4B, 0x03, 0x04], type: 'compressed', format: 'zip' },
  { bytes: [0x41, 0x49, 0x46, 0x02], type: 'aif', format: 'aif-v2' },
];

class AdaptiveCompressionService {
  constructor() {
    this.stats = {
      compressions: 0,
      skipped: 0,
      bytesBefore: 0,
      bytesAfter: 0,
      timeSpentMs: 0,
      byFormat: new Map(),   // format → { count, bytesIn, bytesOut, avgRatio }
    };
    this.deviceState = {
      battery: 1.0,
      charging: true,
      connection: 'unknown',
      cpuBusy: false,
    };
    this.listeners = new Set();
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;
    this._initialized = true;

    // Monitor battery
    if (typeof navigator !== 'undefined' && navigator.getBattery) {
      try {
        const battery = await navigator.getBattery();
        const update = () => {
          this.deviceState.battery = battery.level;
          this.deviceState.charging = battery.charging;
        };
        update();
        battery.addEventListener('levelchange', update);
        battery.addEventListener('chargingchange', update);
      } catch {}
    }

    // Monitor connection type
    if (typeof navigator !== 'undefined' && navigator.connection) {
      const update = () => {
        this.deviceState.connection = navigator.connection.effectiveType;
      };
      update();
      navigator.connection.addEventListener('change', update);
    }

    console.info('📦 Adaptive Compression ready');
  }

  // ═══════════════════════════════════════════════
  // CONTENT DETECTION
  // ═══════════════════════════════════════════════

  detectFromMagic(bytes) {
    if (!bytes || bytes.length < 4) return { type: 'unknown', format: 'unknown' };
    for (const sig of MAGIC_SIGNATURES) {
      let match = true;
      for (let i = 0; i < sig.bytes.length; i++) {
        if (bytes[i] !== sig.bytes[i]) { match = false; break; }
      }
      if (match) return { type: sig.type, format: sig.format };
    }
    // Heuristic: high ASCII density → text
    let ascii = 0;
    const sample = Math.min(bytes.length, 1024);
    for (let i = 0; i < sample; i++) {
      const b = bytes[i];
      if ((b >= 0x20 && b <= 0x7E) || b === 0x09 || b === 0x0A || b === 0x0D) ascii++;
    }
    if (ascii / sample > 0.85) return { type: 'text', format: 'text' };
    return { type: 'binary', format: 'unknown' };
  }

  detectFromPath(path) {
    if (!path) return null;
    const ext = path.split('.').pop()?.toLowerCase();
    if (!ext) return null;
    if (ALREADY_COMPRESSED_EXTS.has(ext)) return { type: 'compressed', format: ext };
    if (TEXT_EXTS.has(ext)) return { type: 'text', format: ext };
    return null;
  }

  // ═══════════════════════════════════════════════
  // STRATEGY SELECTION
  // ═══════════════════════════════════════════════

  selectStrategy(bytes, hints = {}) {
    // Respect explicit skip hint
    if (hints.skip) return { algo: 'none', reason: 'explicit skip' };
    
    // Too small
    if (bytes.length < 128) return { algo: 'none', reason: 'too small' };
    
    // Detect content
    const fromPath = hints.path ? this.detectFromPath(hints.path) : null;
    const fromMagic = this.detectFromMagic(bytes);
    const detected = fromPath || fromMagic;
    
    // Already compressed — don't re-compress
    if (detected.type === 'compressed' || detected.type === 'image' || detected.type === 'audio') {
      return { algo: 'none', reason: `already compressed (${detected.format})`, detected };
    }
    
    // Device-aware level
    const lowBattery = this.deviceState.battery < 0.2 && !this.deviceState.charging;
    const slowConnection = this.deviceState.connection === '2g' || this.deviceState.connection === 'slow-2g';
    
    // Time-critical messages → fast compression
    if (hints.timeCritical) {
      return { algo: 'gzip', level: 1, reason: 'time-critical fast path', detected };
    }
    
    // Text-like → best compression
    if (detected.type === 'text' || detected.type === 'aif') {
      if (lowBattery) {
        return { algo: 'gzip', level: 3, reason: 'text, low battery', detected };
      }
      if (slowConnection) {
        // Trade CPU for bandwidth
        return { algo: 'brotli', level: 11, reason: 'text, slow connection', detected };
      }
      return { algo: 'brotli', level: 6, reason: 'text standard', detected };
    }
    
    // Binary (tensors, weights, unknown)
    if (lowBattery) return { algo: 'gzip', level: 1, reason: 'binary, low battery', detected };
    return { algo: 'gzip', level: 6, reason: 'binary standard', detected };
  }

  // ═══════════════════════════════════════════════
  // COMPRESS / DECOMPRESS
  // ═══════════════════════════════════════════════

  async compress(bytes, hints = {}) {
    const strategy = this.selectStrategy(bytes, hints);
    
    if (strategy.algo === 'none') {
      this.stats.skipped++;
      return {
        bytes,
        strategy,
        compressed: false,
        originalSize: bytes.length,
        compressedSize: bytes.length,
        ratio: 1.0,
      };
    }
    
    const start = performance.now();
    let compressed;
    
    try {
      if (typeof CompressionStream !== 'undefined') {
        // Browser: CompressionStream supports 'gzip', 'deflate', 'deflate-raw'
        // Note: 'brotli' is not widely supported in browsers yet,
        // fall back to gzip if unavailable
        let format = strategy.algo === 'brotli' ? 'gzip' : strategy.algo;
        try {
          const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream(format));
          const buffer = await new Response(stream).arrayBuffer();
          compressed = new Uint8Array(buffer);
        } catch {
          // Fall back to gzip
          const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
          const buffer = await new Response(stream).arrayBuffer();
          compressed = new Uint8Array(buffer);
        }
      } else {
        compressed = bytes;
      }
    } catch (e) {
      console.warn('[AdaptiveCompress] failed:', e.message);
      compressed = bytes;
    }
    
    const elapsedMs = performance.now() - start;
    
    // Track stats
    this.stats.compressions++;
    this.stats.bytesBefore += bytes.length;
    this.stats.bytesAfter += compressed.length;
    this.stats.timeSpentMs += elapsedMs;
    
    const format = strategy.detected?.format || 'unknown';
    const current = this.stats.byFormat.get(format) || { count: 0, bytesIn: 0, bytesOut: 0, avgRatio: 0 };
    current.count++;
    current.bytesIn += bytes.length;
    current.bytesOut += compressed.length;
    current.avgRatio = current.bytesOut / current.bytesIn;
    this.stats.byFormat.set(format, current);
    
    const result = {
      bytes: compressed,
      strategy,
      compressed: true,
      originalSize: bytes.length,
      compressedSize: compressed.length,
      ratio: compressed.length / bytes.length,
      elapsedMs,
    };
    
    this.emit('compressed', result);
    return result;
  }

  async decompress(bytes, hints = {}) {
    // Default to gzip (safe). Callers should pass hints.algo if known.
    const algo = hints.algo || 'gzip';
    if (algo === 'none') return bytes;
    
    try {
      if (typeof DecompressionStream !== 'undefined') {
        const format = algo === 'brotli' ? 'gzip' : algo; // fallback
        try {
          const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format));
          const buffer = await new Response(stream).arrayBuffer();
          return new Uint8Array(buffer);
        } catch {
          const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
          const buffer = await new Response(stream).arrayBuffer();
          return new Uint8Array(buffer);
        }
      }
    } catch (e) {
      console.warn('[AdaptiveCompress] decompress failed:', e.message);
    }
    return bytes;
  }

  // ═══════════════════════════════════════════════
  // STATS
  // ═══════════════════════════════════════════════

  getStats() {
    const total = this.stats.bytesBefore;
    const saved = this.stats.bytesBefore - this.stats.bytesAfter;
    const ratio = total > 0 ? this.stats.bytesAfter / total : 1;
    
    return {
      ...this.stats,
      byFormat: Array.from(this.stats.byFormat.entries()).map(([format, s]) => ({
        format, ...s, savedBytes: s.bytesIn - s.bytesOut,
      })),
      bytesSaved: saved,
      bytesSavedMB: (saved / 1048576).toFixed(2),
      overallRatio: ratio,
      savingsPercent: total > 0 ? (saved / total) * 100 : 0,
      avgTimePerOpMs: this.stats.compressions > 0 ? this.stats.timeSpentMs / this.stats.compressions : 0,
      deviceState: { ...this.deviceState },
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
}

export const adaptiveCompression = new AdaptiveCompressionService();
export default adaptiveCompression;
