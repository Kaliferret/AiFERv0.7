// Sprint 4 — AI Optimization Dashboard
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard, NeonButton, NeonBadge, NeonProgress, TOKENS, NeonGlobalStyles, FloatingOrb } from '@/components/ui/neon-ui';
import { Zap, Database, Activity, Battery, Wifi, TrendingDown, Clock, Archive, Sparkles } from 'lucide-react';

const { colors: C, bg } = TOKENS;

export default function OptimizationDashboard() {
  const [cacheStats, setCacheStats] = useState(null);
  const [compStats, setCompStats] = useState(null);
  const [walrusStats, setWalrusStats] = useState(null);
  const [schedStats, setSchedStats] = useState(null);
  const [schedTasks, setSchedTasks] = useState([]);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [
        { semanticCache },
        { adaptiveCompression },
        { walrusPrefetch },
        { scheduler },
      ] = await Promise.all([
        import('@/services/semanticCacheService'),
        import('@/services/adaptiveCompressionService'),
        import('@/services/walrusPrefetchService'),
        import('@/services/energyAwareScheduler'),
      ]);
      
      await adaptiveCompression.init();
      await walrusPrefetch.init();
      await scheduler.init();
      
      const update = () => {
        setCacheStats(semanticCache.getStats());
        setCompStats(adaptiveCompression.getStats());
        setWalrusStats(walrusPrefetch.getStats());
        setSchedStats(scheduler.getStats());
        setSchedTasks(scheduler.getTaskList());
      };
      
      update();
      const iv = setInterval(update, 1000);
      return () => clearInterval(iv);
    };
    load();
  }, []);

  const simulateLoad = async () => {
    setSimulating(true);
    const { semanticCache } = await import('@/services/semanticCacheService');
    const { adaptiveCompression } = await import('@/services/adaptiveCompressionService');
    
    const queries = [
      'Wat is het weer vandaag?',
      'Weer van nu?',
      'Hoe laat is het?',
      'Tijd?',
      'Maak een todo app',
      'Bouw todo lijst',
      'Leg uit hoe mesh werkt',
      'Mesh uitleg',
    ];
    
    // Prime cache
    for (let i = 0; i < 4; i++) {
      semanticCache.store(queries[i * 2], `Response voor "${queries[i * 2]}"`, { inferenceMs: 500 });
    }
    
    // Lookup similar ones
    for (const q of queries) {
      await semanticCache.lookup(q);
    }
    
    // Simulate compression on different content types
    const text = new TextEncoder().encode('Hello '.repeat(200));
    const binary = new Uint8Array(500).map(() => Math.floor(Math.random() * 256));
    const jpeg = new Uint8Array([0xFF, 0xD8, 0xFF, ...Array(500).fill(0)]);
    
    await adaptiveCompression.compress(text, { path: 'test.txt' });
    await adaptiveCompression.compress(binary);
    await adaptiveCompression.compress(jpeg, { path: 'photo.jpg' });
    
    setSimulating(false);
  };

  const priorityColor = (name) => ({
    CRITICAL: C.magenta, HIGH: C.orange, NORMAL: C.cyan, LOW: C.violet, BACKGROUND: 'rgba(255,255,255,0.4)',
  }[name] || C.cyan);

  if (!cacheStats) {
    return (
      <div style={{ minHeight: '100vh', background: bg.deep, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Sparkles style={{ width: 48, height: 48, color: C.violet, animation: 'aifer-spin 2s linear infinite' }} />
        <NeonGlobalStyles />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: bg.deep, color: '#fff', padding: '24px 16px', fontFamily: "'Outfit',system-ui", position: 'relative', overflow: 'hidden' }}>
      <NeonGlobalStyles />
      <FloatingOrb color="violet" size={340} position={{ top: '-12%', right: '-8%' }} />
      <FloatingOrb color="neon" size={280} position={{ bottom: '-8%', left: '-10%' }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
            <Sparkles style={{ width: 28, height: 28, color: C.violet, animation: 'aifer-glow 3s ease-in-out infinite' }} />
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>
              AI <span style={{ color: C.violet }}>Optimizations</span>
            </h1>
            <NeonBadge color="violet" pulse>SPRINT 4</NeonBadge>
            <div style={{ flex: 1 }} />
            <NeonButton variant="primary" onClick={simulateLoad} loading={simulating}>
              <Zap size={14} /> Simulate load
            </NeonButton>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            Semantic cache · Adaptive compression · Predictive Walrus prefetch · Energy-aware scheduler
          </p>
        </div>

        {/* Device state bar */}
        <GlassCard style={{ padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Battery size={16} color={compStats?.deviceState?.battery < 0.3 ? C.magenta : C.neon} />
              <div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>BATTERY</div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono'" }}>
                  {Math.round((compStats?.deviceState?.battery || 1) * 100)}%
                  {compStats?.deviceState?.charging && <span style={{ color: C.neon, marginLeft: 4 }}>⚡</span>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wifi size={16} color={C.cyan} />
              <div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>NETWORK</div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono'" }}>
                  {compStats?.deviceState?.connection || 'unknown'}
                </div>
              </div>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
              Scheduler runs: <span style={{ color: C.neon, fontFamily: "'JetBrains Mono'" }}>{schedStats?.totalRuns || 0}</span> · 
              Skipped: <span style={{ color: C.gold, fontFamily: "'JetBrains Mono'" }}>{schedStats?.totalSkipped || 0}</span>
            </div>
          </div>
        </GlassCard>

        {/* Semantic Cache */}
        <GlassCard style={{ padding: 20, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Database size={20} color={C.cyan} />
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>🧠 Semantic Cache</h3>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0 0' }}>
                  Similar queries → same cache hit. Threshold {cacheStats.threshold}
                </p>
              </div>
            </div>
            <NeonBadge color={cacheStats.hitRate > 30 ? 'neon' : 'violet'}>
              {cacheStats.hitRate.toFixed(1)}% HIT RATE
            </NeonBadge>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 12 }}>
            <div style={{ padding: 10, background: bg.subtle, borderRadius: 8 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>LOOKUPS</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.cyan, fontFamily: "'JetBrains Mono'" }}>
                {cacheStats.lookups}
              </div>
            </div>
            <div style={{ padding: 10, background: bg.subtle, borderRadius: 8 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>HITS</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.neon, fontFamily: "'JetBrains Mono'" }}>
                {cacheStats.hits}
              </div>
            </div>
            <div style={{ padding: 10, background: bg.subtle, borderRadius: 8 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>BYTES SAVED</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.neon, fontFamily: "'JetBrains Mono'" }}>
                {(cacheStats.bytesServed / 1024).toFixed(1)}KB
              </div>
            </div>
            <div style={{ padding: 10, background: bg.subtle, borderRadius: 8 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>INFERENCE SAVED</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.violet, fontFamily: "'JetBrains Mono'" }}>
                {(cacheStats.inferenceSavedMs / 1000).toFixed(1)}s
              </div>
            </div>
            <div style={{ padding: 10, background: bg.subtle, borderRadius: 8 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>CACHE SIZE</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.gold, fontFamily: "'JetBrains Mono'" }}>
                {cacheStats.size}
              </div>
            </div>
          </div>
          
          {cacheStats.topEntries?.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Top hit queries</div>
              {cacheStats.topEntries.slice(0, 3).map((e, i) => (
                <div key={i} style={{ fontSize: 10, padding: '3px 0', display: 'flex', gap: 8 }}>
                  <span style={{ color: C.cyan, fontFamily: "'JetBrains Mono'" }}>#{i+1}</span>
                  <span style={{ flex: 1, color: 'rgba(255,255,255,0.7)' }}>{e.query}</span>
                  <span style={{ color: C.neon }}>×{e.hits}</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Adaptive Compression */}
        <GlassCard style={{ padding: 20, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Archive size={20} color={C.gold} />
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>📦 Adaptive Compression</h3>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0 0' }}>
                  Auto-picks gzip/brotli per content type, skips already-compressed
                </p>
              </div>
            </div>
            <NeonBadge color="gold">{compStats?.savingsPercent?.toFixed(1)}% SAVED</NeonBadge>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 12 }}>
            <div style={{ padding: 10, background: bg.subtle, borderRadius: 8 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>OPERATIONS</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.gold, fontFamily: "'JetBrains Mono'" }}>
                {compStats?.compressions || 0}
              </div>
            </div>
            <div style={{ padding: 10, background: bg.subtle, borderRadius: 8 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>SKIPPED</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.violet, fontFamily: "'JetBrains Mono'" }}>
                {compStats?.skipped || 0}
              </div>
            </div>
            <div style={{ padding: 10, background: bg.subtle, borderRadius: 8 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>SAVED</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.neon, fontFamily: "'JetBrains Mono'" }}>
                {compStats?.bytesSavedMB || 0}MB
              </div>
            </div>
            <div style={{ padding: 10, background: bg.subtle, borderRadius: 8 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>AVG TIME</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.cyan, fontFamily: "'JetBrains Mono'" }}>
                {compStats?.avgTimePerOpMs?.toFixed(1) || 0}ms
              </div>
            </div>
          </div>
          
          {compStats?.byFormat?.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Per format</div>
              {compStats.byFormat.slice(0, 4).map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', fontSize: 10 }}>
                  <span style={{ color: C.gold, fontFamily: "'JetBrains Mono'", width: 60 }}>{f.format}</span>
                  <span style={{ color: 'rgba(255,255,255,0.6)', width: 40 }}>×{f.count}</span>
                  <NeonProgress value={(1 - f.avgRatio) * 100} max={100} color="gold" showLabel={false} height={3} />
                  <span style={{ color: C.neon, fontFamily: "'JetBrains Mono'", width: 50, textAlign: 'right' }}>
                    {((1 - f.avgRatio) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Walrus Prefetch */}
        <GlassCard style={{ padding: 20, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <TrendingDown size={20} color={C.neon} />
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>🐋 Walrus Predictive Prefetch</h3>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0 0' }}>
                  LSTM-driven warm cache for decentralized storage blobs
                </p>
              </div>
            </div>
            <NeonBadge color="neon">{walrusStats?.hitRate?.toFixed(1)}% HIT</NeonBadge>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
            <div style={{ padding: 10, background: bg.subtle, borderRadius: 8 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>MAPPINGS</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.cyan, fontFamily: "'JetBrains Mono'" }}>
                {walrusStats?.knownMappings || 0}
              </div>
            </div>
            <div style={{ padding: 10, background: bg.subtle, borderRadius: 8 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>CACHED BLOBS</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.violet, fontFamily: "'JetBrains Mono'" }}>
                {walrusStats?.cachedBlobs || 0}
              </div>
            </div>
            <div style={{ padding: 10, background: bg.subtle, borderRadius: 8 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>CACHE SIZE</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.gold, fontFamily: "'JetBrains Mono'" }}>
                {walrusStats?.cachedMB || 0}MB
              </div>
            </div>
            <div style={{ padding: 10, background: bg.subtle, borderRadius: 8 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>QUEUE</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.sky, fontFamily: "'JetBrains Mono'" }}>
                {walrusStats?.queueLength || 0}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Energy-Aware Scheduler */}
        <GlassCard style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Activity size={20} color={C.magenta} />
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>⚡ Energy-Aware Scheduler</h3>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0 0' }}>
                  Priority tiers · battery/network/mesh awareness
                </p>
              </div>
            </div>
            <NeonBadge color="magenta">{schedStats?.tasks} TASKS</NeonBadge>
          </div>
          
          <div style={{ display: 'grid', gap: 6 }}>
            {schedTasks.map(t => {
              const pc = priorityColor(t.priorityName);
              return (
                <div key={t.id} style={{
                  padding: '8px 12px', background: bg.subtle, borderRadius: 8,
                  display: 'flex', alignItems: 'center', gap: 10,
                  borderLeft: `3px solid ${pc}`,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono'" }}>{t.id}</div>
                  </div>
                  <span style={{
                    fontSize: 8, padding: '2px 6px', borderRadius: 4,
                    background: `${pc}20`, color: pc, fontWeight: 700,
                  }}>
                    {t.priorityName}
                  </span>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono'", width: 80, textAlign: 'right' }}>
                    ✓{t.runCount} ⏭{t.skipCount}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <div style={{ textAlign: 'center', padding: '28px 0 10px', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
          ⚡ Sprint 4 · AI Optimization Layer
        </div>
      </div>
    </div>
  );
}
