import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import PopShell, { POPOS_TOKENS as T } from '@/components/ui/PopShell';
import { PopButton, PopBadge, PopInput, SectionHeader, PopPanel, EmptyState } from '@/components/ui/popos-primitives';
import {
  LayoutDashboard, MessageSquare, Activity, Wallet, Users,
  FolderOpen, StickyNote, Terminal, Mail, Image as ImageIcon,
  Calendar, Music, CheckSquare, CloudSun, Dumbbell,
  FileCode, Package, Brain, Sparkles, Zap, Globe, Cpu,
  Shield, Store, Settings, Search, Grid3x3,
} from 'lucide-react';

const APPS = [
  { id: 'dashboard', name: 'Dashboard', path: '/Dashboard', icon: LayoutDashboard, cat: 'essentials', accent: 'pop' },
  { id: 'chat', name: 'Chat', path: '/Chat', icon: MessageSquare, cat: 'essentials', accent: 'mesh' },
  { id: 'feed', name: 'Feed', path: '/Feed', icon: Activity, cat: 'essentials', accent: 'ai' },
  { id: 'wallet', name: 'Wallet', path: '/Wallet', icon: Wallet, cat: 'essentials', accent: 'crypto' },
  { id: 'profile', name: 'Profile', path: '/Profile', icon: Users, cat: 'essentials', accent: 'ferret' },
  { id: 'files', name: 'Files', path: '/FerretFiles', icon: FolderOpen, cat: 'productivity' },
  { id: 'notes', name: 'Notes', path: '/FerretNotes', icon: StickyNote, cat: 'productivity' },
  { id: 'tasks', name: 'Tasks', path: '/FerretTasks', icon: CheckSquare, cat: 'productivity', isNew: true, accent: 'ferret' },
  { id: 'calendar', name: 'Calendar', path: '/FerretCalendar', icon: Calendar, cat: 'productivity' },
  { id: 'mail', name: 'Mail', path: '/FerretMail', icon: Mail, cat: 'productivity' },
  { id: 'terminal', name: 'Terminal', path: '/FerretTerminal', icon: Terminal, cat: 'productivity' },
  { id: 'gallery', name: 'Gallery', path: '/FerretGallery', icon: ImageIcon, cat: 'media' },
  { id: 'media', name: 'Media', path: '/FerretMedia', icon: Music, cat: 'media' },
  { id: 'weather', name: 'Weather', path: '/FerretWeather', icon: CloudSun, cat: 'media', isNew: true, accent: 'mesh' },
  { id: 'fitness', name: 'Fitness', path: '/FerretFitness', icon: Dumbbell, cat: 'media', isNew: true, accent: 'success' },
  { id: 'fercode', name: 'FERCode v2', path: '/FERCodeV2', icon: FileCode, cat: 'dev', isNew: true, accent: 'ai' },
  { id: 'aifinspect', name: 'AIF Inspector', path: '/AIFInspector', icon: Package, cat: 'dev', accent: 'pop' },
  { id: 'ml', name: 'ML Engine', path: '/MLDashboard', icon: Brain, cat: 'dev', accent: 'ai' },
  { id: 'predict', name: 'Predictive', path: '/PredictiveDashboard', icon: Sparkles, cat: 'dev', accent: 'ai' },
  { id: 'optim', name: 'Optimization', path: '/OptimizationDashboard', icon: Zap, cat: 'dev', accent: 'pop' },
  { id: 'mesh', name: 'Mesh', path: '/MeshNetwork', icon: Globe, cat: 'system', accent: 'mesh' },
  { id: 'physics', name: 'Physics', path: '/PhysicsDashboard', icon: Cpu, cat: 'system' },
  { id: 'validation', name: 'Validation', path: '/ValidationDashboard', icon: Shield, cat: 'system', accent: 'success' },
  { id: 'marketplace', name: 'Marketplace', path: '/AifMarketplace', icon: Store, cat: 'system', accent: 'crypto' },
  { id: 'settings', name: 'Settings', path: '/Settings', icon: Settings, cat: 'system' },
];

const CATEGORIES = [
  { id: 'essentials', label: 'Essentials' },
  { id: 'productivity', label: 'Productivity' },
  { id: 'media', label: 'Media' },
  { id: 'dev', label: 'Developer' },
  { id: 'system', label: 'System' },
];

function AppTile({ app, onClick }) {
  const color = T.colors[app.accent] || T.colors.pop;
  const Icon = app.icon;
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        background: T.bg.raised,
        border: `1px solid ${T.border.subtle}`,
        borderRadius: T.radius.lg,
        padding: `${T.space.lg}px ${T.space.md}px`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: T.space.sm,
        cursor: 'pointer', textAlign: 'center',
        fontFamily: T.font.sans, color: T.colors.text,
        transition: `all ${T.motion.fast} ${T.motion.ease}`,
        position: 'relative',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border.subtle; }}
    >
      {app.isNew && (
        <span style={{
          position: 'absolute', top: 6, right: 6,
          fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
          padding: '1px 5px', borderRadius: 3,
          background: T.colors.pop, color: '#000',
        }}>NEW</span>
      )}
      <div style={{
        width: 44, height: 44, borderRadius: T.radius.md,
        background: color + '15', border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon size={20} color={color} strokeWidth={1.8} /></div>
      <div style={{ fontSize: T.text.sm, fontWeight: 500, color: T.colors.text }}>{app.name}</div>
    </motion.button>
  );
}

export default function AppLauncher() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [meshPeers, setMeshPeers] = useState(0);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const load = async () => {
      try {
        const { ferMesh } = await import('@/services/ferMeshService');
        const s = ferMesh.getStats?.();
        if (s) setMeshPeers(s.peerCount || 0);
      } catch {}
    };
    load();
    const iv = setInterval(() => { load(); setTime(new Date()); }, 5000);
    const tIv = setInterval(() => setTime(new Date()), 1000);
    return () => { clearInterval(iv); clearInterval(tIv); };
  }, []);

  const filtered = useMemo(() => {
    if (!query) return APPS;
    const q = query.toLowerCase();
    return APPS.filter(a => a.name.toLowerCase().includes(q) || a.cat.toLowerCase().includes(q));
  }, [query]);

  const grouped = useMemo(() => {
    const g = {};
    CATEGORIES.forEach(c => { g[c.id] = []; });
    filtered.forEach(a => { if (g[a.cat]) g[a.cat].push(a); });
    return g;
  }, [filtered]);

  return (
    <PopShell title="Applications">
      <PopPanel maxWidth={1300}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: T.space.md,
          marginBottom: T.space.lg, flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 250 }}>
            <div style={{
              fontSize: T.text.xs, color: T.colors.textDim,
              letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase',
            }}>
              {time.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <h1 style={{
              fontSize: T.text.hero, fontWeight: 700,
              color: T.colors.text, margin: '2px 0 0',
              letterSpacing: '-0.02em',
            }}>
              Applications
            </h1>
          </div>
          <div style={{ display: 'flex', gap: T.space.sm, alignItems: 'center' }}>
            <PopBadge variant={meshPeers > 0 ? 'mesh' : 'default'} dot pulse={meshPeers > 0}>
              {meshPeers} peers
            </PopBadge>
            <PopBadge variant="ferret">{APPS.length} apps</PopBadge>
          </div>
        </div>

        <div style={{ marginBottom: T.space.xl, maxWidth: 500 }}>
          <PopInput
            icon={Search}
            placeholder="Zoek apps..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {CATEGORIES.map(cat => {
          const apps = grouped[cat.id];
          if (!apps || apps.length === 0) return null;
          return (
            <div key={cat.id} style={{ marginBottom: T.space.xl }}>
              <SectionHeader
                title={cat.label}
                subtitle={`${apps.length} ${apps.length === 1 ? 'app' : 'apps'}`}
              />
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: T.space.sm,
              }}>
                {apps.map(app => <AppTile key={app.id} app={app} onClick={() => navigate(app.path)} />)}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <EmptyState
            icon={Grid3x3}
            title="Geen apps gevonden"
            description={`Geen resultaten voor "${query}"`}
            action={<PopButton variant="primary" onClick={() => setQuery('')}>Reset zoekopdracht</PopButton>}
          />
        )}
      </PopPanel>
    </PopShell>
  );
}
