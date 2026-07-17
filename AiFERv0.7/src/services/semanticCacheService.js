/**
 * Semantic Cache Service
 * 
 * Traditional cache: key → value (exact match)
 * Semantic cache:    embedding(query) → value (similarity match)
 * 
 * "Wat is het weer?" and "Weer vandaag?" should hit the same cache entry,
 * saving bandwidth and inference compute.
 * 
 * How it works:
 * 1. Compute a cheap lightweight embedding for each query (hash-based, no ML needed for v1)
 * 2. Store {embedding, response, metadata} pairs
 * 3. On lookup, compute cosine similarity with all cached embeddings
 * 4. If best match > threshold (default 0.85), return cached response
 * 5. Otherwise fall through to actual inference
 * 
 * Upgrade path: replace the hash embedder with a real sentence embedder
 * (like MiniLM-v2 via ONNX) for far better accuracy. The API stays the same.
 */

// ═══════════════════════════════════════════════════════════
// LIGHTWEIGHT EMBEDDER — fast, no ML dependencies
// ═══════════════════════════════════════════════════════════

/**
 * Simple hash-based embedding using n-gram + character rolling hash.
 * Produces a 128-dim vector. Not perfect semantic similarity but cheap
 * and good enough for "same question, different wording".
 */
class LightweightEmbedder {
  constructor(dim = 128) {
    this.dim = dim;
  }

  // Normalize text: lowercase, remove punctuation, trim, remove stopwords
  normalize(text) {
    const stopwords = new Set([
      'de', 'het', 'een', 'en', 'van', 'in', 'op', 'voor', 'is', 'dat',
      'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
      'of', 'to', 'in', 'on', 'for', 'at', 'by', 'with',
    ]);
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w && !stopwords.has(w))
      .join(' ');
  }

  // Rolling hash for strings
  hash(str, seed = 0) {
    let h = 2166136261 ^ seed;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // N-gram features (bag of n-grams)
  ngrams(text, n = 3) {
    const grams = [];
    const padded = ' '.repeat(n - 1) + text + ' '.repeat(n - 1);
    for (let i = 0; i <= padded.length - n; i++) {
      grams.push(padded.slice(i, i + n));
    }
    return grams;
  }

  // Tokens (word-level features)
  tokens(text) {
    return text.split(/\s+/).filter(Boolean);
  }

  /**
   * Produce a normalized embedding vector
   */
  embed(text) {
    const normalized = this.normalize(text);
    const vec = new Float32Array(this.dim);
    
    // Use character trigrams + word tokens
    const features = [
      ...this.ngrams(normalized, 3),
      ...this.ngrams(normalized, 2),
      ...this.tokens(normalized),
    ];
    
    for (const feat of features) {
      // Hash into multiple positions (like feature hashing)
      for (let h = 0; h < 3; h++) {
        const idx = this.hash(feat, h) % this.dim;
        const sign = (this.hash(feat, h + 100) % 2) === 0 ? 1 : -1;
        vec[idx] += sign;
      }
    }
    
    // L2 normalize
    let norm = 0;
    for (let i = 0; i < this.dim; i++) norm += vec[i] * vec[i];
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < this.dim; i++) vec[i] /= norm;
    
    return vec;
  }

  /**
   * Cosine similarity between two normalized vectors (range 0-1)
   */
  similarity(a, b) {
    if (a.length !== b.length) return 0;
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return (dot + 1) / 2; // normalize from [-1, 1] to [0, 1]
  }
}

// ═══════════════════════════════════════════════════════════
// SEMANTIC CACHE
// ═══════════════════════════════════════════════════════════

class SemanticCache {
  constructor(options = {}) {
    this.embedder = new LightweightEmbedder(options.dim || 128);
    this.threshold = options.threshold || 0.85;       // similarity cutoff
    this.maxEntries = options.maxEntries || 200;       // LRU cap
    this.ttl = options.ttl || 30 * 60 * 1000;          // 30 min default
    this.entries = [];                                  // array of { embedding, query, response, metadata, cachedAt, hits }
    this.stats = {
      lookups: 0,
      hits: 0,
      misses: 0,
      bytesServed: 0,
      inferenceSavedMs: 0,
    };
    this.listeners = new Set();
  }

  /**
   * Lookup — returns cached response if similar enough
   */
  async lookup(query, options = {}) {
    this.stats.lookups++;
    
    const queryEmbedding = this.embedder.embed(query);
    const threshold = options.threshold || this.threshold;
    const now = Date.now();
    
    let best = null;
    let bestSim = 0;
    
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      // Skip expired entries
      if (now - entry.cachedAt > this.ttl) continue;
      
      const sim = this.embedder.similarity(queryEmbedding, entry.embedding);
      if (sim > bestSim) {
        bestSim = sim;
        best = { entry, index: i };
      }
    }
    
    if (best && bestSim >= threshold) {
      best.entry.hits++;
      best.entry.lastAccessedAt = now;
      this.stats.hits++;
      this.stats.bytesServed += best.entry.responseBytes || 0;
      this.stats.inferenceSavedMs += best.entry.avgInferenceMs || 500;
      
      this.emit('hit', {
        query,
        similarity: bestSim,
        cachedQuery: best.entry.query,
        age: now - best.entry.cachedAt,
      });
      
      return {
        hit: true,
        response: best.entry.response,
        similarity: bestSim,
        originalQuery: best.entry.query,
        age: now - best.entry.cachedAt,
      };
    }
    
    this.stats.misses++;
    this.emit('miss', { query, bestSim });
    return { hit: false, bestSimilarity: bestSim };
  }

  /**
   * Store a query→response pair in the cache
   */
  store(query, response, metadata = {}) {
    const embedding = this.embedder.embed(query);
    const responseBytes = typeof response === 'string' ? response.length : JSON.stringify(response).length;
    
    const entry = {
      embedding,
      query,
      response,
      metadata,
      responseBytes,
      avgInferenceMs: metadata.inferenceMs || 500,
      cachedAt: Date.now(),
      lastAccessedAt: Date.now(),
      hits: 0,
    };
    
    this.entries.push(entry);
    
    // Evict oldest-accessed if over capacity
    if (this.entries.length > this.maxEntries) {
      this.entries.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
      this.entries = this.entries.slice(0, this.maxEntries);
    }
    
    this.emit('stored', { query, responseBytes });
    return entry;
  }

  /**
   * Invalidate entries by query pattern
   */
  invalidate(pattern) {
    const before = this.entries.length;
    if (typeof pattern === 'string') {
      this.entries = this.entries.filter(e => !e.query.includes(pattern));
    } else if (pattern instanceof RegExp) {
      this.entries = this.entries.filter(e => !pattern.test(e.query));
    }
    return before - this.entries.length;
  }

  clear() {
    this.entries = [];
    this.emit('cleared');
  }

  getStats() {
    const now = Date.now();
    const active = this.entries.filter(e => now - e.cachedAt <= this.ttl);
    const hitRate = this.stats.lookups > 0 ? (this.stats.hits / this.stats.lookups) * 100 : 0;
    
    return {
      ...this.stats,
      hitRate,
      size: active.length,
      totalSize: this.entries.length,
      threshold: this.threshold,
      topEntries: active.sort((a, b) => b.hits - a.hits).slice(0, 5).map(e => ({
        query: e.query.slice(0, 60),
        hits: e.hits,
        age: now - e.cachedAt,
      })),
    };
  }

  setThreshold(t) { this.threshold = Math.max(0, Math.min(1, t)); }

  on(event, cb) {
    const w = (e, d) => { if (e === event || event === '*') cb(e === event ? d : e, d); };
    this.listeners.add(w);
    return () => this.listeners.delete(w);
  }

  emit(event, data) {
    this.listeners.forEach(cb => { try { cb(event, data); } catch {} });
  }
}

export const semanticCache = new SemanticCache();
export { SemanticCache, LightweightEmbedder };
export default semanticCache;
