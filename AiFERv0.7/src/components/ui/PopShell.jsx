// PopShell — responsive app frame
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { POPOS_TOKENS as T } from './popos-tokens';
import {
  LayoutDashboard, MessageSquare, Activity, Wallet, Users,
  FolderOpen, StickyNote, Terminal, Mail, Image as ImageIcon,
  Calendar, Music, CheckSquare, CloudSun, Dumbbell,
  FileCode, Package, Brain, Sparkles, Zap, Globe, Cpu,
  Shield, Store, Settings, Search, Bell, ChevronLeft,
  Menu, X, Home, Grid3x3,
} from 'lucide-react';

const NAV_SECTIONS = [
  { id: 'home', items: [
    { id: 'launcher', label: 'Home', path: '/AppLauncher', icon: Home },
    { id: 'dashboard', label: 'Dashboard', path: '/Dashboard', icon: LayoutDashboard },
    { id: 'chat', label: 'Chat', path: '/Chat', icon: MessageSquare },
    { id: 'feed', label: 'Feed', path: '/Feed', icon: Activity },
  ]},
  { id: 'productivity', label: 'PRODUCTIVITY', items: [
    { id: 'files', label: 'Files', path: '/FerretFiles', icon: FolderOpen },
    { id: 'notes', label: 'Notes', path: '/FerretNotes', icon: StickyNote },
    { id: 'tasks', label: 'Tasks', path: '/FerretTasks', icon: CheckSquare, isNew: true },
    { id: 'calendar', label: 'Calendar', path: '/FerretCalendar', icon: Calendar },
    { id: 'mail', label: 'Mail', path: '/FerretMail', icon: Mail },
    { id: 'terminal', label: 'Terminal', path: '/FerretTerminal', icon: Terminal },
  ]},
  { id: 'media', label: 'MEDIA', items: [
    { id: 'gallery', label: 'Gallery', path: '/FerretGallery', icon: ImageIcon },
    { id: 'media', label: 'Media', path: '/FerretMedia', icon: Music },
    { id: 'weather', label: 'Weather', path: '/FerretWeather', icon: CloudSun, isNew: true },
    { id: 'fitness', label: 'Fitness', path: '/FerretFitness', icon: Dumbbell, isNew: true },
  ]},
  { id: 'dev', label: 'DEVELOPER', items: [
    { id: 'fercode', label: 'FERCode', path: '/FERCodeV2', icon: FileCode, isNew: true },
    { id: 'inspect', label: 'AIF Inspector', path: '/AIFInspector', icon: Package },
    { id: 'ml', label: 'ML Engine', path: '/MLDashboard', icon: Brain },
    { id: 'predict', label: 'Predictive', path: '/PredictiveDashboard', icon: Sparkles },
    { id: 'optim', label: 'Optimization', path: '/OptimizationDashboard', icon: Zap },
  ]},
  { id: 'system', label: 'SYSTEM', items: [
    { id: 'mesh', label: 'Mesh', path: '/MeshNetwork', icon: Globe },
    { id: 'physics', label: 'Physics', path: '/PhysicsDashboard', icon: Cpu },
    { id: 'validation', label: 'Validation', path: '/ValidationDashboard', icon: Shield },
    { id: 'wallet', label: 'Wallet', path: '/Wallet', icon: Wallet },
    { id: 'marketplace', label: 'Marketplace', path: '/AifMarketplace', icon: Store },
    { id: 'settings', label: 'Settings', path: '/Settings', icon: Settings },
  ]},
];

const MOBILE_NAV = [
  { id: 'launcher', label: 'Home', path: '/AppLauncher', icon: Home },
  { id: 'chat', label: 'Chat', path: '/Chat', icon: MessageSquare },
  { id: 'fercode', label: 'Code', path: '/FERCodeV2', icon: FileCode },
  { id: 'mesh', label: 'Mesh', path: '/MeshNetwork', icon: Globe },
  { id: 'more', label: 'More', path: '#', icon: Grid3x3 },
];

function useBreakpoint() {
  const [bp, setBp] = useState(() => {
    if (typeof window === 'undefined') return 'desktop';
    const w = window.innerWidth;
    return w < T.bp.mobile ? 'mobile' : w < T.bp.tablet ? 'tablet' : 'desktop';
  });
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      setBp(w < T.bp.mobile ? 'mobile' : w < T.bp.tablet ? 'tablet' : 'desktop');
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return bp;
}

function Sidebar({ collapsed, onToggle, onOpenPalette }) {
  const location = useLocation();
  return (
    <aside style={{
      width: collapsed ? 56 : 230,
      background: T.colors.sidebarBg,
      borderRight: `1px solid ${T.border.subtle}`,
      display: 'flex', flexDirection: 'column',
      transition: `width ${T.motion.normal} ${T.motion.ease}`,
      flexShrink: 0, height: '100vh', position: 'sticky', top: 0,
      fontFamily: T.font.sans,
    }}>
      <div style={{
        height: 48, padding: `0 ${T.space.md}px`,
        display: 'flex', alignItems: 'center', gap: T.space.sm,
        borderBottom: `1px solid ${T.border.subtle}`, cursor: 'pointer',
      }} onClick={onToggle}>
        <div style={{ fontSize: 20 }}>🦝</div>
        {!collapsed && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: T.text.md, fontWeight: 700, color: T.colors.text }}>AiFER</div>
            <div style={{ fontSize: T.text.xs, color: T.colors.textDim, fontFamily: T.font.mono }}>v11</div>
          </div>
        )}
        {!collapsed && <ChevronLeft size={14} color={T.colors.textDim} />}
      </div>

      <div style={{ padding: T.space.sm }}>
        <button onClick={onOpenPalette} style={{
          width: '100%', padding: collapsed ? 8 : '8px 10px',
          background: T.bg.hover, border: `1px solid ${T.border.subtle}`,
          borderRadius: T.radius.md,
          display: 'flex', alignItems: 'center', gap: 8,
          color: T.colors.textMuted, fontSize: T.text.sm, cursor: 'pointer',
          fontFamily: T.font.sans, justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <Search size={14} />
          {!collapsed && (
            <>
              <span style={{ flex: 1, textAlign: 'left' }}>Search...</span>
              <code style={{
                fontSize: 9, padding: '1px 5px', borderRadius: 3,
                background: T.bg.elevated, color: T.colors.textDim,
                fontFamily: T.font.mono, border: `1px solid ${T.border.subtle}`,
              }}>⌘K</code>
            </>
          )}
        </button>
      </div>

      <nav style={{ flex: 1, overflow: 'auto', padding: `0 ${T.space.sm}px` }}>
        {NAV_SECTIONS.map(section => (
          <div key={section.id} style={{ marginBottom: T.space.md }}>
            {section.label && !collapsed && (
              <div style={{
                fontSize: T.text.xs, color: T.colors.textDim,
                letterSpacing: '0.08em', fontWeight: 600,
                padding: `${T.space.sm}px ${T.space.sm}px ${T.space.xs}px`,
                textTransform: 'uppercase',
              }}>{section.label}</div>
            )}
            {section.items.map(item => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link key={item.id} to={item.path} style={{
                  display: 'flex', alignItems: 'center', gap: T.space.sm,
                  padding: `${T.space.sm - 2}px ${T.space.sm}px`,
                  borderRadius: T.radius.md, textDecoration: 'none',
                  color: isActive ? T.colors.pop : T.colors.textMuted,
                  background: isActive ? 'rgba(250,164,26,0.08)' : 'transparent',
                  fontSize: T.text.sm, fontWeight: isActive ? 600 : 500,
                  position: 'relative', marginBottom: 1,
                  transition: `all ${T.motion.fast} ${T.motion.ease}`,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                }}>
                  {isActive && !collapsed && (
                    <div style={{
                      position: 'absolute', left: 0, top: 4, bottom: 4,
                      width: 2, background: T.colors.pop, borderRadius: 1,
                    }} />
                  )}
                  <Icon size={16} color={isActive ? T.colors.pop : T.colors.textMuted} strokeWidth={1.8} />
                  {!collapsed && (
                    <>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {item.isNew && (
                        <span style={{
                          fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
                          padding: '1px 4px', borderRadius: 3,
                          background: T.colors.pop, color: '#000',
                        }}>NEW</span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: T.space.sm, borderTop: `1px solid ${T.border.subtle}` }}>
        <Link to="/Profile" style={{
          display: 'flex', alignItems: 'center', gap: T.space.sm,
          padding: T.space.sm, borderRadius: T.radius.md,
          textDecoration: 'none', background: T.bg.hover,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: `linear-gradient(135deg, ${T.colors.pop}, ${T.colors.ferret})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, flexShrink: 0,
          }}>🦝</div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: T.text.sm, fontWeight: 600, color: T.colors.text }}>You</div>
              <div style={{ fontSize: T.text.xs, color: T.colors.textDim }}>Online · Mesh</div>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}

function TopBar({ title, actions, mobile, onMenuClick }) {
  return (
    <header style={{
      height: 44, minHeight: 44,
      background: T.bg.base,
      borderBottom: `1px solid ${T.border.subtle}`,
      display: 'flex', alignItems: 'center',
      padding: `0 ${T.space.md}px`, gap: T.space.md, flexShrink: 0,
      fontFamily: T.font.sans,
    }}>
      {mobile && (
        <button onClick={onMenuClick} style={{
          background: 'transparent', border: 'none', color: T.colors.text,
          cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center',
        }}>
          <Menu size={18} />
        </button>
      )}
      {title && <div style={{ fontSize: T.text.md, fontWeight: 600, color: T.colors.text }}>{title}</div>}
      <div style={{ flex: 1 }} />
      {actions}
      <button style={{
        background: 'transparent', border: 'none', color: T.colors.textMuted,
        cursor: 'pointer', padding: 6, borderRadius: T.radius.sm,
      }}><Bell size={16} /></button>
    </header>
  );
}

function StatusBar() {
  const [peers, setPeers] = useState(0);
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const load = async () => {
      try {
        const { ferMesh } = await import('@/services/ferMeshService');
        const s = ferMesh.getStats?.();
        if (s) setPeers(s.peerCount || 0);
      } catch {}
    };
    load();
    const iv = setInterval(() => { load(); setTime(new Date()); }, 5000);
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => { clearInterval(iv); clearInterval(t); };
  }, []);
  return (
    <footer style={{
      height: 24, minHeight: 24,
      background: T.colors.sidebarBg,
      borderTop: `1px solid ${T.border.subtle}`,
      display: 'flex', alignItems: 'center',
      padding: `0 ${T.space.md}px`, gap: T.space.md,
      fontSize: T.text.xs, color: T.colors.textMuted,
      fontFamily: T.font.mono, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: peers > 0 ? T.colors.success : T.colors.danger,
          boxShadow: peers > 0 ? `0 0 6px ${T.colors.success}` : 'none',
        }} />
        <span>{peers > 0 ? `${peers} peers` : 'offline'}</span>
      </div>
      <div style={{ flex: 1 }} />
      <div>v11</div>
      <div>{time.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}</div>
    </footer>
  );
}

function BottomNav({ onMoreClick }) {
  const location = useLocation();
  return (
    <nav style={{
      height: 56, minHeight: 56,
      background: T.colors.sidebarBg,
      borderTop: `1px solid ${T.border.subtle}`,
      display: 'flex', flexShrink: 0, fontFamily: T.font.sans,
    }}>
      {MOBILE_NAV.map(item => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        if (item.id === 'more') {
          return (
            <button key={item.id} onClick={onMoreClick} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 3, padding: 6, background: 'transparent', border: 'none',
              cursor: 'pointer', color: T.colors.textMuted, fontSize: 10,
            }}>
              <Icon size={20} /><span>{item.label}</span>
            </button>
          );
        }
        return (
          <Link key={item.id} to={item.path} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 3, padding: 6, textDecoration: 'none',
            color: isActive ? T.colors.pop : T.colors.textMuted,
            fontSize: 10, fontWeight: isActive ? 600 : 500, position: 'relative',
          }}>
            {isActive && (
              <div style={{
                position: 'absolute', top: 0, left: '20%', right: '20%',
                height: 2, background: T.colors.pop, borderRadius: 1,
              }} />
            )}
            <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function MobileDrawer({ open, onClose }) {
  const location = useLocation();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(0,0,0,0.6)' }}
          />
          <motion.aside
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed', top: 0, bottom: 0, left: 0,
              width: 280, zIndex: 100, background: T.colors.sidebarBg,
              borderRight: `1px solid ${T.border.subtle}`,
              display: 'flex', flexDirection: 'column',
              fontFamily: T.font.sans, overflowY: 'auto',
            }}
          >
            <div style={{
              height: 48, padding: `0 ${T.space.md}px`,
              display: 'flex', alignItems: 'center', gap: T.space.sm,
              borderBottom: `1px solid ${T.border.subtle}`, flexShrink: 0,
            }}>
              <div style={{ fontSize: 20 }}>🦝</div>
              <div style={{ flex: 1, fontSize: T.text.md, fontWeight: 700, color: T.colors.text }}>AiFER</div>
              <button onClick={onClose} style={{
                background: 'transparent', border: 'none', color: T.colors.textMuted,
                cursor: 'pointer', padding: 6,
              }}><X size={18} /></button>
            </div>
            <nav style={{ flex: 1, padding: T.space.sm }}>
              {NAV_SECTIONS.map(section => (
                <div key={section.id} style={{ marginBottom: T.space.md }}>
                  {section.label && (
                    <div style={{
                      fontSize: T.text.xs, color: T.colors.textDim,
                      letterSpacing: '0.08em', fontWeight: 600,
                      padding: `${T.space.sm}px ${T.space.sm}px ${T.space.xs}px`,
                      textTransform: 'uppercase',
                    }}>{section.label}</div>
                  )}
                  {section.items.map(item => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    return (
                      <Link key={item.id} to={item.path} onClick={onClose} style={{
                        display: 'flex', alignItems: 'center', gap: T.space.sm,
                        padding: `${T.space.sm}px ${T.space.sm}px`,
                        borderRadius: T.radius.md, textDecoration: 'none',
                        color: isActive ? T.colors.pop : T.colors.textMuted,
                        background: isActive ? 'rgba(250,164,26,0.08)' : 'transparent',
                        fontSize: T.text.base, fontWeight: isActive ? 600 : 500,
                        marginBottom: 1,
                      }}>
                        <Icon size={18} color={isActive ? T.colors.pop : T.colors.textMuted} strokeWidth={1.8} />
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.isNew && (
                          <span style={{
                            fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
                            padding: '1px 4px', borderRadius: 3,
                            background: T.colors.pop, color: '#000',
                          }}>NEW</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function CommandPaletteOverlay({ onClose }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const allItems = useMemo(() => {
    const items = [];
    NAV_SECTIONS.forEach(s => s.items.forEach(i => items.push({ ...i, section: s.label || s.id })));
    return items;
  }, []);
  const filtered = useMemo(() => {
    if (!query) return allItems;
    const q = query.toLowerCase();
    return allItems.filter(i => i.label.toLowerCase().includes(q) || (i.section || '').toLowerCase().includes(q));
  }, [query, allItems]);
  useEffect(() => {
    inputRef.current?.focus();
    const h = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(filtered.length - 1, s + 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(0, s - 1)); }
      if (e.key === 'Enter' && filtered[selected]) { window.location.href = filtered[selected].path; onClose(); }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [filtered, selected, onClose]);
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '15vh',
      }}
    >
      <motion.div
        initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '90%', maxWidth: 560, background: T.bg.raised,
          border: `1px solid ${T.border.regular}`, borderRadius: T.radius.lg,
          boxShadow: T.shadow.lg, overflow: 'hidden', fontFamily: T.font.sans,
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px', borderBottom: `1px solid ${T.border.subtle}`,
        }}>
          <Search size={16} color={T.colors.pop} />
          <input
            ref={inputRef} value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            placeholder="Zoek app, commando, page..."
            style={{
              flex: 1, background: 'transparent', border: 'none',
              color: T.colors.text, fontSize: T.text.md, outline: 'none',
              fontFamily: T.font.sans,
            }}
          />
          <code style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 3,
            background: T.bg.elevated, color: T.colors.textDim,
            fontFamily: T.font.mono,
          }}>ESC</code>
        </div>
        <div style={{ maxHeight: 400, overflow: 'auto', padding: 4 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: T.colors.textDim, fontSize: T.text.sm }}>
              Geen resultaten voor "{query}"
            </div>
          ) : filtered.map((item, i) => {
            const Icon = item.icon;
            return (
              <Link key={`${item.id}-${i}`} to={item.path} onClick={onClose}
                onMouseEnter={() => setSelected(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: T.radius.md, textDecoration: 'none',
                  background: selected === i ? 'rgba(250,164,26,0.1)' : 'transparent',
                  borderLeft: selected === i ? `2px solid ${T.colors.pop}` : '2px solid transparent',
                }}
              >
                <Icon size={15} color={selected === i ? T.colors.pop : T.colors.textMuted} />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: T.text.sm,
                    color: selected === i ? T.colors.text : T.colors.textMuted,
                    fontWeight: selected === i ? 600 : 500,
                  }}>{item.label}</div>
                  <div style={{ fontSize: T.text.xs, color: T.colors.textDim, fontFamily: T.font.mono }}>
                    {item.section} · {item.path}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function PopShell({ children, title, actions }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);
  return (
    <div style={{
      display: 'flex', minHeight: '100vh', height: '100vh',
      background: T.bg.base, color: T.colors.text,
      fontFamily: T.font.sans, overflow: 'hidden',
    }}>
      {!isMobile && <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} onOpenPalette={() => setPaletteOpen(true)} />}
      {isMobile && <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        <TopBar title={title} actions={actions} mobile={isMobile} onMenuClick={() => setDrawerOpen(true)} />
        <main style={{ flex: 1, overflow: 'auto', background: T.bg.base }}>{children}</main>
        {!isMobile && <StatusBar />}
        {isMobile && <BottomNav onMoreClick={() => setDrawerOpen(true)} />}
      </div>
      {paletteOpen && <CommandPaletteOverlay onClose={() => setPaletteOpen(false)} />}
    </div>
  );
}

export { T as POPOS_TOKENS };
