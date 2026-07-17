// Validation Dashboard — Production readiness for v10
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, NeonButton, NeonBadge, NeonProgress, TOKENS, NeonGlobalStyles, FloatingOrb } from '@/components/ui/neon-ui';
import { Activity, Shield, Zap, CheckCircle2, XCircle, AlertTriangle, TrendingUp, Play, Clock } from 'lucide-react';

const { colors: C, bg } = TOKENS;

export default function ValidationDashboard() {
  const [benchResults, setBenchResults] = useState(null);
  const [privacyReport, setPrivacyReport] = useState(null);
  const [chaosReport, setChaosReport] = useState(null);
  const [running, setRunning] = useState(null);
  const [progress, setProgress] = useState({ bench: [], privacy: [], chaos: [] });

  const runBenchmarks = async () => {
    setRunning('bench');
    setProgress(p => ({ ...p, bench: [] }));
    const { benchmarkService } = await import('@/services/benchmarkService');
    
    const unsub = benchmarkService.on('*', (e, d) => {
      if (e === 'benchStart') setProgress(p => ({ ...p, bench: [...p.bench, { id: d.id, status: 'running' }] }));
      if (e === 'benchComplete') setProgress(p => ({ ...p, bench: p.bench.map(b => b.id === d.id ? { ...b, status: 'done', result: d.result } : b) }));
    });
    
    const results = await benchmarkService.runAll();
    setBenchResults(results);
    unsub();
    setRunning(null);
  };

  const runPrivacyAudit = async () => {
    setRunning('privacy');
    const { privacyAudit } = await import('@/services/privacyAuditService');
    const report = await privacyAudit.runFullAudit();
    setPrivacyReport(report);
    setRunning(null);
  };

  const runChaosTests = async () => {
    setRunning('chaos');
    setProgress(p => ({ ...p, chaos: [] }));
    const { chaosTesting } = await import('@/services/chaosTestingService');
    
    const unsub = chaosTesting.on('*', (e, d) => {
      if (e === 'scenarioStart') setProgress(p => ({ ...p, chaos: [...p.chaos, { id: d.id, status: 'running' }] }));
      if (e === 'scenarioComplete') setProgress(p => ({ ...p, chaos: p.chaos.map(c => c.id === d.id ? { ...c, ...d, status: 'done' } : c) }));
    });
    
    const report = await chaosTesting.runAll();
    setChaosReport(report);
    unsub();
    setRunning(null);
  };

  const runAll = async () => {
    await runBenchmarks();
    await runPrivacyAudit();
    await runChaosTests();
  };

  // Overall production readiness score
  const overallScore = () => {
    if (!benchResults || !privacyReport || !chaosReport) return null;
    const privScore = privacyReport.privacyScore;
    const chaosScore = chaosReport.passRate;
    // Benchmark score: normalize verdict (use cache hit rate + compression as proxy)
    const benchScore = Math.min(100,
      (benchResults['semantic-cache']?.accuracy || 50) * 0.4 +
      (benchResults['compression']?.overallSavings || 20) * 2 * 0.3 +
      50 * 0.3
    );
    return Math.round(privScore * 0.35 + chaosScore * 0.35 + benchScore * 0.3);
  };

  const score = overallScore();
  const grade = score === null ? '—' : score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  const gradeColor = score === null ? C.muted : score >= 80 ? C.neon : score >= 60 ? C.gold : C.magenta;

  return (
    <div style={{ minHeight: '100vh', background: bg.deep, color: '#fff', padding: '24px 16px', fontFamily: "'Outfit',system-ui", position: 'relative', overflow: 'hidden' }}>
      <NeonGlobalStyles />
      <FloatingOrb color="cyan" size={340} position={{ top: '-15%', left: '-5%' }} />
      <FloatingOrb color="gold" size={260} position={{ bottom: '-10%', right: '-5%' }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
            <Activity style={{ width: 28, height: 28, color: C.cyan, animation: 'aifer-glow 3s ease-in-out infinite' }} />
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>
              v10 <span style={{ color: C.cyan }}>Validation</span>
            </h1>
            <NeonBadge color="cyan">SPRINT 5</NeonBadge>
            <div style={{ flex: 1 }} />
            <NeonButton variant="primary" onClick={runAll} loading={running !== null}>
              <Play size={14} /> Run full validation
            </NeonButton>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            Benchmarks · Privacy audit · Chaos testing — bewijs dat v10 productie-klaar is
          </p>
        </div>

        {/* Production readiness hero */}
        <GlassCard style={{ padding: 24, marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', marginBottom: 8 }}>
            PRODUCTION READINESS SCORE
          </div>
          <motion.div
            key={score}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ fontSize: 72, fontWeight: 900, color: gradeColor, fontFamily: "'JetBrains Mono'", lineHeight: 1 }}
          >
            {grade}
          </motion.div>
          <div style={{ fontSize: 36, fontWeight: 700, color: gradeColor, marginTop: 4, fontFamily: "'JetBrains Mono'" }}>
            {score ?? '—'}<span style={{ fontSize: 18, opacity: 0.5 }}>/100</span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
            {score === null ? 'Run validation to compute' :
             score >= 80 ? '✅ Productie-klaar' :
             score >= 60 ? '⚠️  Aandachtspunten vóór launch' :
             '❌ Niet productie-klaar — fix issues'}
          </div>
        </GlassCard>

        {/* 3 cards for the 3 validation categories */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 16 }}>
          {/* Benchmarks */}
          <GlassCard style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <TrendingUp size={18} color={C.neon} />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Benchmarks</h3>
              <div style={{ flex: 1 }} />
              <NeonButton size="sm" variant="ghost" onClick={runBenchmarks} disabled={running !== null}>
                Run
              </NeonButton>
            </div>
            
            {benchResults ? (
              <div style={{ display: 'grid', gap: 5 }}>
                {Object.entries(benchResults).map(([id, r]) => (
                  <div key={id} style={{ padding: '6px 10px', background: bg.subtle, borderRadius: 6, fontSize: 10 }}>
                    <div style={{ color: C.neon, fontWeight: 600, fontFamily: "'JetBrains Mono'" }}>{id}</div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                      {r.verdict || r.error || '—'}
                    </div>
                  </div>
                ))}
              </div>
            ) : progress.bench.length > 0 ? (
              <div style={{ display: 'grid', gap: 4 }}>
                {progress.bench.map(b => (
                  <div key={b.id} style={{ fontSize: 10, color: b.status === 'done' ? C.neon : C.muted, fontFamily: "'JetBrains Mono'" }}>
                    {b.status === 'done' ? '✓' : '◌'} {b.id}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: 16, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                Klik Run om benchmarks te draaien
              </div>
            )}
          </GlassCard>

          {/* Privacy */}
          <GlassCard style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Shield size={18} color={C.violet} />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Privacy Audit</h3>
              <div style={{ flex: 1 }} />
              <NeonButton size="sm" variant="ghost" onClick={runPrivacyAudit} disabled={running !== null}>
                Run
              </NeonButton>
            </div>
            
            {privacyReport ? (
              <div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  <div style={{ flex: 1, padding: 8, background: bg.subtle, borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: privacyReport.privacyScore >= 80 ? C.neon : C.gold, fontFamily: "'JetBrains Mono'" }}>
                      {privacyReport.privacyScore}
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>SCORE</div>
                  </div>
                  <div style={{ flex: 1, padding: 8, background: bg.subtle, borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: privacyReport.privacyScore >= 80 ? C.neon : C.gold, fontFamily: "'JetBrains Mono'" }}>
                      {privacyReport.grade}
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>GRADE</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, fontSize: 9, flexWrap: 'wrap' }}>
                  {privacyReport.bySeverity.critical > 0 && <NeonBadge color="magenta">{privacyReport.bySeverity.critical} CRIT</NeonBadge>}
                  {privacyReport.bySeverity.high > 0 && <NeonBadge color="orange">{privacyReport.bySeverity.high} HIGH</NeonBadge>}
                  {privacyReport.bySeverity.medium > 0 && <NeonBadge color="gold">{privacyReport.bySeverity.medium} MED</NeonBadge>}
                  {privacyReport.bySeverity.low > 0 && <NeonBadge color="cyan">{privacyReport.bySeverity.low} LOW</NeonBadge>}
                  {privacyReport.bySeverity.ok > 0 && <NeonBadge color="neon">{privacyReport.bySeverity.ok} OK</NeonBadge>}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 8, fontStyle: 'italic' }}>
                  {privacyReport.summary}
                </div>
              </div>
            ) : (
              <div style={{ padding: 16, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                Klik Run voor privacy scan
              </div>
            )}
          </GlassCard>

          {/* Chaos */}
          <GlassCard style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Zap size={18} color={C.magenta} />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Chaos Testing</h3>
              <div style={{ flex: 1 }} />
              <NeonButton size="sm" variant="ghost" onClick={runChaosTests} disabled={running !== null}>
                Run
              </NeonButton>
            </div>
            
            {chaosReport ? (
              <div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  <div style={{ flex: 1, padding: 8, background: bg.subtle, borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: C.neon, fontFamily: "'JetBrains Mono'" }}>
                      {chaosReport.passed}
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>PASSED</div>
                  </div>
                  <div style={{ flex: 1, padding: 8, background: bg.subtle, borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: chaosReport.failed > 0 ? C.magenta : C.neon, fontFamily: "'JetBrains Mono'" }}>
                      {chaosReport.failed}
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>FAILED</div>
                  </div>
                </div>
                <NeonProgress value={chaosReport.passRate} max={100} color={chaosReport.passRate >= 90 ? 'neon' : 'gold'} showLabel={false} height={4} />
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 8, fontStyle: 'italic' }}>
                  {chaosReport.verdict}
                </div>
              </div>
            ) : progress.chaos.length > 0 ? (
              <div style={{ display: 'grid', gap: 3 }}>
                {progress.chaos.map(c => (
                  <div key={c.id} style={{
                    fontSize: 10,
                    color: c.status === 'done' ? (c.passed ? C.neon : C.magenta) : C.muted,
                    fontFamily: "'JetBrains Mono'",
                  }}>
                    {c.status === 'done' ? (c.passed ? '✓' : '✗') : '◌'} {c.id}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: 16, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                Klik Run voor chaos scenarios
              </div>
            )}
          </GlassCard>
        </div>

        {/* Detailed findings when available */}
        {privacyReport && privacyReport.findings.length > 0 && (
          <GlassCard style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
              🔍 Privacy Findings ({privacyReport.findings.length})
            </h3>
            <div style={{ display: 'grid', gap: 6 }}>
              {privacyReport.findings.slice(0, 6).map((f, i) => {
                const sc = f.severity === 'CRITICAL' ? C.magenta : 
                          f.severity === 'HIGH' ? C.orange :
                          f.severity === 'MEDIUM' ? C.gold :
                          f.severity === 'LOW' ? C.cyan : C.neon;
                return (
                  <div key={f.id} style={{
                    padding: 10, background: bg.subtle, borderRadius: 8,
                    borderLeft: `3px solid ${sc}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: `${sc}20`, color: sc, fontWeight: 700 }}>
                        {f.severity}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{f.title}</span>
                      <span style={{ flex: 1 }} />
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{f.area}</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                      {f.detail}
                    </div>
                    {f.mitigation && (
                      <div style={{ fontSize: 10, color: C.violet, marginTop: 4, fontStyle: 'italic' }}>
                        💡 {f.mitigation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}

        {chaosReport && chaosReport.results.length > 0 && (
          <GlassCard style={{ padding: 20 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
              ⚡ Chaos Scenarios ({chaosReport.results.length})
            </h3>
            <div style={{ display: 'grid', gap: 4 }}>
              {chaosReport.results.map((r, i) => (
                <div key={r.id} style={{
                  padding: '8px 12px', background: bg.subtle, borderRadius: 6,
                  display: 'flex', alignItems: 'center', gap: 10,
                  borderLeft: `2px solid ${r.passed ? C.neon : C.magenta}`,
                }}>
                  {r.passed ? <CheckCircle2 size={14} color={C.neon} /> : <XCircle size={14} color={C.magenta} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{r.observation}</div>
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono'" }}>
                    {r.elapsedMs?.toFixed(0)}ms
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        <div style={{ textAlign: 'center', padding: '28px 0 10px', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
          🦝 Sprint 5 · Validation · v10 Production-Ready
        </div>
      </div>
    </div>
  );
}
