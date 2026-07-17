// AiFER Physics Dashboard — Visualize the mesh laws in real-time
// Shows: Stefan-Boltzmann capacity, Wien frequency optimization, Planck routing

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard, NeonButton, NeonBadge, NeonProgress, AnimatedCounter, TOKENS, NeonGlobalStyles, FloatingOrb } from '@/components/ui/neon-ui';
import { Atom, Radio, Flame, Zap, Activity, Waves } from 'lucide-react';

const { colors, bg } = TOKENS;

export default function PhysicsDashboard() {
  const [physicsState, setPhysicsState] = useState(null);
  const [history, setHistory] = useState([]);
  const [simulating, setSimulating] = useState(false);

  // Poll physics engine
  useEffect(() => {
    let interval;
    const load = async () => {
      const { physicsEngine } = await import('@/services/physicsEngine');
      const update = () => {
        const state = physicsEngine.getState();
        setPhysicsState(state);
        setHistory((h) => [...h.slice(-49), {
          t: Date.now(),
          T: parseFloat(state.stefan.networkTemp),
          cap: state.stefan.capacityRaw / 1e6, // MB/s
          peers: state.stefan.peerCount,
        }]);
      };
      update();
      interval = setInterval(update, 1000);
    };
    load();
    return () => interval && clearInterval(interval);
  }, []);

  const simulateLoad = async (peers = 10, intensity = 50) => {
    setSimulating(true);
    const { physicsEngine } = await import('@/services/physicsEngine');
    
    // Simulate many active peers
    for (let i = 0; i < peers; i++) {
      physicsEngine.stefan.updatePeerTemperature(
        `sim-peer-${i}`,
        Math.random() * intensity,
        Math.random() * 1000 * intensity
      );
    }
    
    // Simulate frequency traffic
    ['2.4', '5.0', '5.4'].forEach((band) => {
      physicsEngine.wien.recordActivity(band, Math.random() * 5e6);
    });
    
    setTimeout(() => setSimulating(false), 2000);
  };

  if (!physicsState) {
    return (
      <div style={{ minHeight: '100vh', background: bg.deep, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Atom style={{ width: 48, height: 48, color: colors.neon, animation: 'aifer-spin 2s linear infinite' }} />
          <div style={{ marginTop: 12, fontSize: 13, color: colors.neon }}>Loading physics...</div>
        </div>
        <NeonGlobalStyles />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: bg.deep, color: '#fff', padding: '24px 16px', fontFamily: "'Outfit', system-ui, sans-serif", position: 'relative', overflow: 'hidden' }}>
      <NeonGlobalStyles />
      
      {/* Ambient orbs */}
      <FloatingOrb color="neon" size={300} position={{ top: '-10%', left: '-10%' }} />
      <FloatingOrb color="cyan" size={250} position={{ bottom: '-5%', right: '-5%' }} />
      <FloatingOrb color="violet" size={200} position={{ top: '40%', right: '10%' }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Atom style={{ width: 28, height: 28, color: colors.neon, animation: 'aifer-glow 3s ease-in-out infinite' }} />
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>
              Physics <span style={{ color: colors.neon }}>Engine</span>
            </h1>
            <NeonBadge color="neon" pulse>LIVE</NeonBadge>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
            Planck · Wien · Stefan-Boltzmann — de drie wetten die de AiFER mesh aansturen
          </p>
        </div>

        {/* Top row — 3 law cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12, marginBottom: 20 }}>
          
          {/* PLANCK */}
          <GlassCard accent="neon" interactive style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: colors.neon, letterSpacing: '0.15em', fontWeight: 700 }}>PLANCK MODULE</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>Probabilistic Routing</div>
              </div>
              <div style={{ 
                width: 40, height: 40, borderRadius: 10,
                background: `${colors.neon}15`, border: `1px solid ${colors.neon}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Zap style={{ width: 20, height: 20, color: colors.neon }} />
              </div>
            </div>
            
            <div style={{ 
              background: bg.subtle, borderRadius: 10, padding: 10, marginBottom: 12,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.6)', textAlign: 'center'
            }}>
              E = h · f
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ padding: 8, background: bg.subtle, borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Active Quanta</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: colors.neon }}>
                  <AnimatedCounter value={physicsState.planck.activeQuanta} />
                </div>
              </div>
              <div style={{ padding: 8, background: bg.subtle, borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Routes</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: colors.neon }}>
                  <AnimatedCounter value={physicsState.planck.routes} />
                </div>
              </div>
            </div>

            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 8, lineHeight: 1.5 }}>
              Messages worden opgesplitst in energy quanta. Route selection via Boltzmann distribution — hoge energie routes krijgen voorkeur, met exploration randomness.
            </div>
          </GlassCard>

          {/* WIEN */}
          <GlassCard accent="cyan" interactive style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: colors.cyan, letterSpacing: '0.15em', fontWeight: 700 }}>WIEN MODULE</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>Peak Frequency</div>
              </div>
              <div style={{ 
                width: 40, height: 40, borderRadius: 10,
                background: `${colors.cyan}15`, border: `1px solid ${colors.cyan}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Radio style={{ width: 20, height: 20, color: colors.cyan }} />
              </div>
            </div>

            <div style={{ 
              background: bg.subtle, borderRadius: 10, padding: 10, marginBottom: 12,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.6)', textAlign: 'center'
            }}>
              λ<sub>max</sub> · T = b
            </div>

            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Optimal band</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: colors.cyan, fontFamily: "'JetBrains Mono'" }}>
                {physicsState.wien.optimal} GHz
              </div>
            </div>

            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Frequency loads</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2, marginBottom: 8 }}>
              {Object.entries(physicsState.wien.loads).map(([band, { load, status }]) => {
                const barColor = status === 'congested' ? colors.magenta : status === 'busy' ? colors.gold : colors.neon;
                return (
                  <div key={band} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{ height: 24, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${load * 100}%` }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                          width: '100%', background: barColor,
                          borderRadius: '2px 2px 0 0',
                          boxShadow: `0 0 6px ${barColor}66`,
                          minHeight: 2,
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 8, color: band === physicsState.wien.optimal ? colors.cyan : 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono'", fontWeight: band === physicsState.wien.optimal ? 700 : 400 }}>
                      {band}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
              Vindt de minst-belaste frequentie dynamisch. Bouncing via piek-efficiency.
            </div>
          </GlassCard>

          {/* STEFAN-BOLTZMANN */}
          <GlassCard accent="violet" interactive style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: colors.violet, letterSpacing: '0.15em', fontWeight: 700 }}>STEFAN-BOLTZMANN</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>T⁴ Capacity</div>
              </div>
              <div style={{ 
                width: 40, height: 40, borderRadius: 10,
                background: `${colors.violet}15`, border: `1px solid ${colors.violet}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Flame style={{ width: 20, height: 20, color: colors.violet }} />
              </div>
            </div>

            <div style={{ 
              background: bg.subtle, borderRadius: 10, padding: 10, marginBottom: 12,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.6)', textAlign: 'center'
            }}>
              P = σ · T⁴
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div style={{ padding: 8, background: bg.subtle, borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Network Temp</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: colors.violet }}>
                  <AnimatedCounter value={parseFloat(physicsState.stefan.networkTemp)} format={(v) => `${v.toFixed(0)}K`} />
                </div>
              </div>
              <div style={{ padding: 8, background: bg.subtle, borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Peers</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: colors.violet }}>
                  <AnimatedCounter value={physicsState.stefan.peerCount} />
                </div>
              </div>
            </div>

            <div style={{ padding: 10, background: `${colors.violet}08`, borderRadius: 8, border: `1px solid ${colors.violet}20` }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Total capacity</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: colors.violet, fontFamily: "'JetBrains Mono'" }}>
                {physicsState.stefan.capacity}
              </div>
            </div>

            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 8, lineHeight: 1.5 }}>
              Netwerk capaciteit schaalt met 4e macht van temperatuur. Actievere peers = exponentieel meer bandbreedte.
            </div>
          </GlassCard>
        </div>

        {/* Mid row — capacity chart */}
        <GlassCard style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Capacity vs Temperature</h3>
              <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Real-time T⁴ scaling curve</p>
            </div>
            <NeonBadge color="violet">LAST 50 TICKS</NeonBadge>
          </div>

          {/* Mini chart */}
          <div style={{ height: 120, display: 'flex', alignItems: 'flex-end', gap: 2, padding: '4px 0', position: 'relative' }}>
            {history.length > 0 && (() => {
              const maxCap = Math.max(...history.map((h) => h.cap), 1);
              return history.map((h, i) => {
                const heightPct = (h.cap / maxCap) * 100;
                const color = h.T > 400 ? colors.magenta : h.T > 320 ? colors.gold : colors.violet;
                return (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPct}%` }}
                    transition={{ duration: 0.3 }}
                    style={{
                      flex: 1, minHeight: 1, background: color,
                      borderRadius: 2, boxShadow: `0 0 6px ${color}66`,
                      opacity: 0.3 + (i / history.length) * 0.7,
                    }}
                  />
                );
              });
            })()}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
            <span>50s ago</span>
            <span>now</span>
          </div>
        </GlassCard>

        {/* Bottom row — simulation controls */}
        <GlassCard style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Test the Physics</h3>
              <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Simuleer mesh activiteit om alle drie de wetten in actie te zien</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <NeonButton variant="primary" onClick={() => simulateLoad(5, 20)} loading={simulating}>
              🌡️ Cold mesh (5 peers)
            </NeonButton>
            <NeonButton variant="primary" onClick={() => simulateLoad(25, 50)} loading={simulating}>
              🔥 Warm mesh (25 peers)
            </NeonButton>
            <NeonButton variant="danger" onClick={() => simulateLoad(100, 100)} loading={simulating}>
              ⚡ Hot mesh (100 peers)
            </NeonButton>
          </div>

          <div style={{ 
            marginTop: 16, padding: 12, background: `${colors.neon}06`, 
            border: `1px solid ${colors.neon}20`, borderRadius: 10 
          }}>
            <div style={{ fontSize: 11, color: colors.neon, fontWeight: 700, marginBottom: 6 }}>
              🔬 Wat je ziet
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
              Meer peers = hogere netwerk-temperatuur = T⁴ scaling → exponentieel meer capaciteit.
              Wien optimaliseert naar de beste frequentie voor die temperatuur.
              Planck splitst messages in quanta en selecteert routes probabilistisch.
            </div>
          </div>
        </GlassCard>

        <div style={{ textAlign: 'center', padding: '32px 0 16px', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
          🦝 AiFER Physics Engine · Planck · Wien · Stefan-Boltzmann
        </div>
      </div>
    </div>
  );
}
