// Predictive Dashboard — Visualizes AI prediction + bandwidth savings
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard, NeonButton, NeonBadge, NeonProgress, AnimatedCounter, TOKENS, NeonGlobalStyles, FloatingOrb } from '@/components/ui/neon-ui';
import { Brain, Zap, TrendingUp, Database, Activity, RefreshCw } from 'lucide-react';

const { colors: C, bg } = TOKENS;

export default function PredictiveDashboard() {
  const [stats, setStats] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [history, setHistory] = useState([]);
  const [aifStats, setAifStats] = useState(null);

  useEffect(() => {
    const load = async () => {
      const { predictivePrefetch } = await import('@/services/predictivePrefetchService');
      await predictivePrefetch.init();
      
      const update = () => {
        const s = predictivePrefetch.getStats();
        setStats(s);
        setPredictions(s.currentPredictions || []);
        setHistory((h) => [...h.slice(-49), {
          t: Date.now(),
          hitRate: s.hitRate,
          saved: s.bytesSaved,
          predictions: s.predictionsGenerated,
        }]);
      };
      
      update();
      const iv = setInterval(update, 2000);
      
      // Load AIF storage stats
      try {
        const { aifStorage } = await import('@/services/aif-runtime/aifFilesystem');
        setAifStats(aifStorage.getStats());
      } catch {}
      
      return () => clearInterval(iv);
    };
    load();
  }, []);

  const simulate = async () => {
    const { predictivePrefetch } = await import('@/services/predictivePrefetchService');
    const actions = ['nav:Chat', 'nav:Wallet', 'nav:MeshNetwork', 'nav:Dashboard', 'nav:Profile',
                     'chat:send', 'file:open', 'nav:AifMarketplace', 'nav:FerretNotes', 'ai:ask'];
    for (let i = 0; i < 30; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      predictivePrefetch.recordAction(action, { sim: true });
      await new Promise(r => setTimeout(r, 30));
    }
  };

  const reset = async () => {
    if (!confirm('Reset prediction history?')) return;
    const { predictivePrefetch } = await import('@/services/predictivePrefetchService');
    predictivePrefetch.reset();
  };

  if (!stats) {
    return (
      <div style={{ minHeight: '100vh', background: bg.deep, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Brain style={{ width: 48, height: 48, color: C.neon, animation: 'aifer-spin 2s linear infinite' }} />
        <NeonGlobalStyles />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: bg.deep, color: '#fff', padding: '24px 16px', fontFamily: "'Outfit',system-ui", position: 'relative', overflow: 'hidden' }}>
      <NeonGlobalStyles />
      <FloatingOrb color="violet" size={350} position={{ top: '-15%', right: '-10%' }} />
      <FloatingOrb color="cyan" size={280} position={{ bottom: '-5%', left: '-5%' }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
            <Brain style={{ width: 28, height: 28, color: C.violet, animation: 'aifer-glow 3s ease-in-out infinite' }} />
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>
              Predictive <span style={{ color: C.violet }}>Engine</span>
            </h1>
            <NeonBadge color="violet" pulse>LEARNING</NeonBadge>
            <div style={{ flex: 1 }} />
            <NeonButton variant="secondary" onClick={simulate}>
              <Activity size={14} /> Simulate usage
            </NeonButton>
            <NeonButton variant="ghost" onClick={reset}>
              <RefreshCw size={14} /> Reset
            </NeonButton>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            AI voorspelt volgende actie · pre-fetcht proactief · bespaart bandbreedte op de mesh
          </p>
        </div>

        {/* Top metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
          <GlassCard style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: C.neon, letterSpacing: '0.15em', fontWeight: 700 }}>HIT RATE</div>
              <TrendingUp size={14} style={{ color: C.neon }} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: C.neon, fontFamily: "'JetBrains Mono'" }}>
              <AnimatedCounter value={Math.round(stats.hitRate)} format={(v) => `${v}%`} />
            </div>
            <NeonProgress value={stats.hitRate} max={100} color="neon" showLabel={false} height={4} />
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
              {stats.cacheHits} hits · {stats.cacheMisses} misses
            </div>
          </GlassCard>

          <GlassCard style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: C.cyan, letterSpacing: '0.15em', fontWeight: 700 }}>BYTES SAVED</div>
              <Zap size={14} style={{ color: C.cyan }} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: C.cyan, fontFamily: "'JetBrains Mono'" }}>
              {stats.bytesSaved >= 1048576 ? `${(stats.bytesSaved / 1048576).toFixed(1)}MB` :
                stats.bytesSaved >= 1024 ? `${(stats.bytesSaved / 1024).toFixed(0)}KB` :
                `${stats.bytesSaved}B`}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
              Prefetched: {(stats.bytesPrefetched / 1024).toFixed(0)}KB · Ratio: {stats.savingsRatio.toFixed(1)}%
            </div>
          </GlassCard>

          <GlassCard style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: C.violet, letterSpacing: '0.15em', fontWeight: 700 }}>TRANSITIONS</div>
              <Database size={14} style={{ color: C.violet }} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: C.violet, fontFamily: "'JetBrains Mono'" }}>
              <AnimatedCounter value={stats.knownTransitions} />
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
              History: {stats.historySize} · Cache: {stats.cacheSize}
            </div>
          </GlassCard>

          <GlassCard style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: C.gold, letterSpacing: '0.15em', fontWeight: 700 }}>PREDICTIONS</div>
              <Brain size={14} style={{ color: C.gold }} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: C.gold, fontFamily: "'JetBrains Mono'" }}>
              <AnimatedCounter value={stats.predictionsGenerated} />
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
              Prefetch attempts: {stats.prefetchAttempts}
            </div>
          </GlassCard>
        </div>

        {/* Current predictions */}
        <GlassCard style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>🎯 Top predictions right now</h3>
            <NeonBadge color="violet">LIVE</NeonBadge>
          </div>
          
          {predictions.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
              Niet genoeg data — klik "Simulate usage" om voorbeelddata te genereren
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              {predictions.map((p, i) => (
                <motion.div
                  key={p.action}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    background: bg.subtle, borderRadius: 10,
                    borderLeft: `3px solid ${i < 3 ? C.neon : C.violet}`,
                  }}
                >
                  <div style={{ fontSize: 11, width: 24, color: 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono'" }}>
                    #{i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono'" }}>{p.action}</div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                      <span>P: {(p.probability * 100).toFixed(0)}%</span>
                      <span>conf: {(p.confidence * 100).toFixed(0)}%</span>
                      <span>n={p.observations}</span>
                    </div>
                  </div>
                  <div style={{ flex: 1, maxWidth: 180 }}>
                    <NeonProgress value={p.probability * 100} max={100} 
                      color={p.confidence > 0.5 ? 'neon' : 'violet'} showLabel={false} height={4} />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* AIF Filesystem stats */}
        <GlassCard style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>📦 AIF Filesystem v2</h3>
              <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Binary format · Content-addressable · Compressed</p>
            </div>
            <NeonBadge color="cyan">AIF v2</NeonBadge>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <div style={{ padding: 12, background: bg.subtle, borderRadius: 8 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>FILES STORED</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.cyan, fontFamily: "'JetBrains Mono'" }}>
                {aifStats?.numFiles ?? 0}
              </div>
            </div>
            <div style={{ padding: 12, background: bg.subtle, borderRadius: 8 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>TOTAL SIZE</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.cyan, fontFamily: "'JetBrains Mono'" }}>
                {aifStats?.totalSizeMB ?? 0} MB
              </div>
            </div>
            <div style={{ padding: 12, background: bg.subtle, borderRadius: 8 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>BINARY SAVINGS</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.neon, fontFamily: "'JetBrains Mono'" }}>
                ~70%
              </div>
            </div>
            <div style={{ padding: 12, background: bg.subtle, borderRadius: 8 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>FEATURES</div>
              <div style={{ fontSize: 11, color: '#fff', marginTop: 4, lineHeight: 1.4 }}>
                ✅ Brotli/gzip<br/>
                ✅ CID addressing<br/>
                ✅ Delta sync
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Hit rate chart */}
        <GlassCard style={{ padding: 20 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Hit Rate over time</h3>
          <div style={{ height: 80, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
            {history.length > 0 ? history.map((h, i) => {
              const color = h.hitRate > 60 ? C.neon : h.hitRate > 30 ? C.gold : C.magenta;
              return (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(2, h.hitRate)}%` }}
                  style={{
                    flex: 1, minHeight: 2, background: color, borderRadius: 2,
                    opacity: 0.3 + (i / history.length) * 0.7,
                    boxShadow: `0 0 4px ${color}66`,
                  }}
                />
              );
            }) : (
              <div style={{ flex: 1, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 11, alignSelf: 'center' }}>
                Collecting data...
              </div>
            )}
          </div>
        </GlassCard>

        <div style={{ textAlign: 'center', padding: '24px 0 10px', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
          🔮 Predictive Engine · Markov chains + Physics-aware prefetch
        </div>
      </div>
    </div>
  );
}
