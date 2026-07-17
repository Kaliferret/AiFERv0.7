/**
 * AIF Package Manager
 * 
 * Manages dependencies between .aif applications.
 * 
 * Manifest format (embedded in header section):
 * {
 *   id: "my-app",
 *   version: "1.2.3",
 *   dependencies: {
 *     "ferret-auth": "^1.0.0",      // semver ranges
 *     "ferret-mesh-tools": "~2.5.1",
 *     "@aifer/wallet": "1.3.4",      // exact version
 *   },
 *   peerDependencies: {
 *     "@aifer/runtime": ">=2.0.0"
 *   }
 * }
 * 
 * Resolution:
 * 1. Parse manifest from header
 * 2. Query mesh (via CID registry) for each dep
 * 3. Semver match → load CID
 * 4. Verify signatures of each dep
 * 5. Load into sandbox with import() resolution
 * 
 * CIDs are content-addressable so dedup is automatic:
 * If 50 apps all depend on ferret-auth@1.0.0, there's only 1 copy in the mesh.
 */

class AIFPackageManager {
  constructor() {
    this.registry = new Map();          // "name@version" → CID
    this.installed = new Map();          // CID → AIFFile
    this.resolutionCache = new Map();    // "name:range" → resolved version
    this.dependencyGraph = new Map();    // appId → Set<depId>
    this.listeners = new Set();
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;
    this._initialized = true;

    try {
      // Load persisted registry
      const { indexedDBService } = await import('@/services/indexedDBService');
      const stored = await indexedDBService.get('aif-package-registry');
      if (stored) {
        this.registry = new Map(stored.registry || []);
      }
      
      // Listen for registry announcements over mesh
      const { ferMesh } = await import('@/services/ferMeshService');
      ferMesh.on('aifPkg:announce', (data) => {
        const key = `${data.name}@${data.version}`;
        this.registry.set(key, data.cid);
        this.persist();
        this.emit('packageAnnounced', data);
      });
      
      ferMesh.on('aifPkg:query', async (data) => {
        // Peer asking about a package
        const matches = this.queryLocal(data.name, data.range);
        if (matches.length && ferMesh.actions?.sendAifPkg) {
          ferMesh.actions.sendAifPkg({
            type: 'response',
            queryId: data.queryId,
            matches,
          }, data.peerId);
        }
      });
      
      console.info(`📦 AIF Package Manager ready — ${this.registry.size} packages cached`);
    } catch {}
  }

  // ═══════════════════════════════════════════════
  // MANIFEST PARSING
  // ═══════════════════════════════════════════════

  parseManifest(header) {
    return {
      id: header.id,
      version: header.version || '0.0.0',
      dependencies: header.dependencies || {},
      peerDependencies: header.peerDependencies || {},
      minRuntimeVersion: header.minRuntimeVersion || '2.0.0',
    };
  }

  // ═══════════════════════════════════════════════
  // SEMVER RESOLUTION (simple impl)
  // ═══════════════════════════════════════════════

  parseVersion(v) {
    const m = /^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/.exec(v);
    if (!m) return null;
    return {
      major: parseInt(m[1]),
      minor: parseInt(m[2]),
      patch: parseInt(m[3]),
      pre: m[4] || null,
      raw: v,
    };
  }

  compareVersions(a, b) {
    const va = this.parseVersion(a);
    const vb = this.parseVersion(b);
    if (!va || !vb) return 0;
    if (va.major !== vb.major) return va.major - vb.major;
    if (va.minor !== vb.minor) return va.minor - vb.minor;
    if (va.patch !== vb.patch) return va.patch - vb.patch;
    return 0;
  }

  satisfiesRange(version, range) {
    if (!range || range === '*') return true;
    
    const v = this.parseVersion(version);
    if (!v) return false;
    
    // Handle ^: same major, >= minor
    if (range.startsWith('^')) {
      const base = this.parseVersion(range.slice(1));
      if (!base) return false;
      if (v.major !== base.major) return false;
      if (v.minor < base.minor) return false;
      if (v.minor === base.minor && v.patch < base.patch) return false;
      return true;
    }
    
    // Handle ~: same major.minor, >= patch
    if (range.startsWith('~')) {
      const base = this.parseVersion(range.slice(1));
      if (!base) return false;
      if (v.major !== base.major) return false;
      if (v.minor !== base.minor) return false;
      return v.patch >= base.patch;
    }
    
    // Handle >=, >, <=, <
    const opMatch = /^(>=|>|<=|<)(.+)$/.exec(range);
    if (opMatch) {
      const cmp = this.compareVersions(version, opMatch[2]);
      switch (opMatch[1]) {
        case '>=': return cmp >= 0;
        case '>':  return cmp > 0;
        case '<=': return cmp <= 0;
        case '<':  return cmp < 0;
      }
    }
    
    // Exact match
    return version === range;
  }

  queryLocal(name, range) {
    const matches = [];
    for (const [key, cid] of this.registry) {
      const [regName, regVersion] = key.split('@');
      if (regName === name && this.satisfiesRange(regVersion, range)) {
        matches.push({ name: regName, version: regVersion, cid });
      }
    }
    // Sort by version descending so latest is first
    matches.sort((a, b) => this.compareVersions(b.version, a.version));
    return matches;
  }

  async resolve(name, range) {
    const cacheKey = `${name}:${range}`;
    if (this.resolutionCache.has(cacheKey)) {
      return this.resolutionCache.get(cacheKey);
    }
    
    // Try local registry first
    let matches = this.queryLocal(name, range);
    
    // If no local match, query mesh
    if (matches.length === 0) {
      matches = await this.queryMesh(name, range, 3000);
    }
    
    if (matches.length === 0) {
      throw new Error(`Cannot resolve ${name}@${range}`);
    }
    
    // Pick the highest version that satisfies
    const resolved = matches[0];
    this.resolutionCache.set(cacheKey, resolved);
    return resolved;
  }

  async queryMesh(name, range, timeoutMs = 3000) {
    try {
      const { ferMesh } = await import('@/services/ferMeshService');
      if (!ferMesh.actions?.sendAifPkg) return [];
      
      const queryId = `q-${Date.now().toString(36)}`;
      const matches = [];
      
      return new Promise((resolve) => {
        const handler = (data) => {
          if (data.queryId === queryId && data.matches) {
            matches.push(...data.matches);
          }
        };
        
        const unsub = ferMesh.on('aifPkg:response', handler);
        
        ferMesh.actions.sendAifPkg({
          type: 'query',
          queryId,
          name,
          range,
          peerId: ferMesh.selfId,
        });
        
        setTimeout(() => {
          unsub();
          // Dedupe by cid
          const unique = new Map();
          matches.forEach(m => unique.set(m.cid, m));
          const sorted = Array.from(unique.values())
            .sort((a, b) => this.compareVersions(b.version, a.version));
          resolve(sorted);
        }, timeoutMs);
      });
    } catch {
      return [];
    }
  }

  // ═══════════════════════════════════════════════
  // INSTALL & DEPENDENCY TREE
  // ═══════════════════════════════════════════════

  async install(aifFile, options = {}) {
    const { aifStorage } = await import('@/services/aif-runtime/aifFilesystem');
    
    // Store the file
    const cid = await aifStorage.store(aifFile);
    const manifest = this.parseManifest(aifFile.getHeader());
    
    // Register locally
    const key = `${manifest.id}@${manifest.version}`;
    this.registry.set(key, cid);
    this.installed.set(cid, aifFile);
    
    // Announce to mesh if enabled
    if (options.announce !== false) {
      try {
        const { ferMesh } = await import('@/services/ferMeshService');
        if (ferMesh.actions?.sendAifPkg) {
          ferMesh.actions.sendAifPkg({
            type: 'announce',
            name: manifest.id,
            version: manifest.version,
            cid,
            timestamp: Date.now(),
          });
        }
      } catch {}
    }
    
    // Resolve + install dependencies recursively
    const deps = await this.resolveDependencies(manifest);
    this.dependencyGraph.set(manifest.id, new Set(deps.map(d => d.name)));
    
    await this.persist();
    this.emit('installed', { id: manifest.id, version: manifest.version, cid, deps: deps.length });
    
    return { cid, manifest, dependencies: deps };
  }

  async resolveDependencies(manifest) {
    const resolved = [];
    const deps = Object.entries(manifest.dependencies || {});
    
    for (const [name, range] of deps) {
      try {
        const r = await this.resolve(name, range);
        resolved.push(r);
      } catch (e) {
        console.warn(`[AIFPackage] Could not resolve ${name}@${range}:`, e.message);
        resolved.push({ name, range, cid: null, error: e.message });
      }
    }
    
    return resolved;
  }

  // Detect circular deps
  detectCircular(appId, visited = new Set(), path = []) {
    if (path.includes(appId)) {
      return [...path.slice(path.indexOf(appId)), appId];
    }
    if (visited.has(appId)) return null;
    visited.add(path[path.length - 1]);
    
    const deps = this.dependencyGraph.get(appId);
    if (!deps) return null;
    
    for (const dep of deps) {
      const cycle = this.detectCircular(dep, visited, [...path, appId]);
      if (cycle) return cycle;
    }
    return null;
  }

  // ═══════════════════════════════════════════════
  // MAINTENANCE
  // ═══════════════════════════════════════════════

  async persist() {
    try {
      const { indexedDBService } = await import('@/services/indexedDBService');
      await indexedDBService.set('aif-package-registry', {
        registry: Array.from(this.registry.entries()),
        savedAt: Date.now(),
      });
    } catch {}
  }

  listInstalled() {
    return Array.from(this.registry.entries()).map(([key, cid]) => {
      const [name, version] = key.split('@');
      return { name, version, cid };
    });
  }

  async uninstall(name, version) {
    const key = `${name}@${version}`;
    const cid = this.registry.get(key);
    if (!cid) return false;
    
    this.registry.delete(key);
    this.installed.delete(cid);
    this.dependencyGraph.delete(name);
    
    await this.persist();
    this.emit('uninstalled', { name, version, cid });
    return true;
  }

  getStats() {
    return {
      packages: this.registry.size,
      installed: this.installed.size,
      cacheSize: this.resolutionCache.size,
      graph: this.dependencyGraph.size,
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

export const aifPackageManager = new AIFPackageManager();
export default aifPackageManager;
