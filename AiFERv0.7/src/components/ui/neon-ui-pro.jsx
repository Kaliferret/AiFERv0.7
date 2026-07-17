// Enhanced UI primitives — micro-interactions + delightful details
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TOKENS, GlassCard, NeonButton, NeonBadge, NeonGlobalStyles } from './neon-ui';
import { X, Command, Search, ChevronRight } from 'lucide-react';

const { colors: C, bg } = TOKENS;

// ═══════════════════════════════════════════════════════════
// RIPPLE BUTTON — material-inspired tap feedback
// ═══════════════════════════════════════════════════════════

export function RippleButton({ children, onClick, color = 'neon', variant = 'primary', ...props }) {
  const [ripples, setRipples] = useState([]);
  const colorValue = C[color] || C.neon;
  
  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples(r => [...r, { x, y, id }]);
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 600);
    onClick?.(e);
  };
  
  const bgStyle = variant === 'primary' 
    ? `linear-gradient(135deg, ${colorValue}, ${colorValue}dd)`
    : `${colorValue}15`;
  
  return (
    <button
      onClick={handleClick}
      style={{
        position: 'relative', overflow: 'hidden',
        padding: '10px 16px', borderRadius: 10,
        background: bgStyle,
        color: variant === 'primary' ? '#000' : colorValue,
        border: variant === 'primary' ? 'none' : `1px solid ${colorValue}30`,
        fontWeight: 600, fontSize: 13, cursor: 'pointer',
        fontFamily: "'Outfit',system-ui",
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
      {...props}
    >
      {children}
      {ripples.map(r => (
        <motion.span
          key={r.id}
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            position: 'absolute', left: r.x - 10, top: r.y - 10,
            width: 20, height: 20, borderRadius: '50%',
            background: variant === 'primary' ? 'rgba(0,0,0,0.3)' : `${colorValue}40`,
            pointerEvents: 'none',
          }}
        />
      ))}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
// SWIPEABLE CARD — touch-friendly dismiss/action
// ═══════════════════════════════════════════════════════════

export function SwipeableCard({ children, onSwipeLeft, onSwipeRight, color = 'neon' }) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const colorValue = C[color] || C.neon;
  
  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: -200, right: 200 }}
      dragElastic={0.1}
      onDragEnd={(e, info) => {
        if (Math.abs(info.offset.x) > 100) {
          if (info.offset.x < 0) onSwipeLeft?.();
          else onSwipeRight?.();
        }
        setOffset(0);
      }}
      onDrag={(e, info) => setOffset(info.offset.x)}
      style={{
        background: bg.elev1, borderRadius: 14,
        padding: 16, position: 'relative',
        borderLeft: `3px solid ${offset > 50 ? C.neon : offset < -50 ? C.magenta : colorValue}`,
        cursor: 'grab',
      }}
    >
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// COMMAND PALETTE — Cmd+K power-user launcher
// ═══════════════════════════════════════════════════════════

export function CommandPalette({ commands = [], onClose, onExecute }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  
  const filtered = commands.filter(c => 
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.category?.toLowerCase().includes(query.toLowerCase())
  );
  
  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(filtered.length - 1, s + 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(0, s - 1)); }
      if (e.key === 'Enter' && filtered[selected]) { 
        e.preventDefault(); 
        onExecute?.(filtered[selected]); 
        onClose?.(); 
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [filtered, selected, onClose, onExecute]);
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          paddingTop: '15vh',
        }}
      >
        <motion.div
          initial={{ y: -20, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -20, opacity: 0, scale: 0.95 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '90%', maxWidth: 600, background: bg.elev1,
            borderRadius: 16, boxShadow: `0 20px 60px ${C.neon}15`,
            border: `1px solid ${C.neon}22`, overflow: 'hidden',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '14px 16px', borderBottom: `1px solid ${bg.border}`,
          }}>
            <Search size={16} color={C.neon} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setSelected(0); }}
              placeholder="Type a command of zoek een app..."
              style={{
                flex: 1, background: 'transparent', border: 'none',
                color: '#fff', fontSize: 14, outline: 'none',
                fontFamily: "'Outfit',system-ui",
              }}
            />
            <NeonBadge color="violet">⌘K</NeonBadge>
          </div>
          <div style={{ maxHeight: 400, overflow: 'auto', padding: 6 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                Geen resultaten voor "{query}"
              </div>
            ) : filtered.map((cmd, i) => (
              <div
                key={cmd.id || i}
                onClick={() => { onExecute?.(cmd); onClose?.(); }}
                onMouseEnter={() => setSelected(i)}
                style={{
                  padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: selected === i ? `${C.neon}12` : 'transparent',
                  borderLeft: selected === i ? `2px solid ${C.neon}` : '2px solid transparent',
                }}
              >
                {cmd.icon && <cmd.icon size={14} color={C.neon} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#fff' }}>{cmd.label}</div>
                  {cmd.category && (
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                      {cmd.category}
                    </div>
                  )}
                </div>
                {cmd.shortcut && (
                  <code style={{
                    fontSize: 10, padding: '2px 6px', borderRadius: 4,
                    background: bg.subtle, color: 'rgba(255,255,255,0.5)',
                    fontFamily: "'JetBrains Mono'",
                  }}>
                    {cmd.shortcut}
                  </code>
                )}
                {selected === i && <ChevronRight size={14} color={C.neon} />}
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════
// TOAST SYSTEM — non-intrusive notifications
// ═══════════════════════════════════════════════════════════

let toastQueue = [];
let toastListeners = [];

export const toast = {
  success: (msg, opts) => pushToast('success', msg, opts),
  error:   (msg, opts) => pushToast('error', msg, opts),
  info:    (msg, opts) => pushToast('info', msg, opts),
  warn:    (msg, opts) => pushToast('warn', msg, opts),
};

function pushToast(type, msg, opts = {}) {
  const t = { id: Date.now() + Math.random(), type, msg, duration: opts.duration || 3500 };
  toastQueue.push(t);
  toastListeners.forEach(cb => cb([...toastQueue]));
  setTimeout(() => {
    toastQueue = toastQueue.filter(x => x.id !== t.id);
    toastListeners.forEach(cb => cb([...toastQueue]));
  }, t.duration);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const cb = (list) => setToasts(list);
    toastListeners.push(cb);
    return () => { toastListeners = toastListeners.filter(l => l !== cb); };
  }, []);
  
  const typeColor = { success: C.neon, error: C.magenta, info: C.cyan, warn: C.gold };
  
  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 10000,
      display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none',
    }}>
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            style={{
              padding: '10px 14px', borderRadius: 10,
              background: bg.elev1, 
              border: `1px solid ${typeColor[t.type]}44`,
              borderLeft: `3px solid ${typeColor[t.type]}`,
              color: '#fff', fontSize: 12,
              boxShadow: `0 4px 20px ${typeColor[t.type]}22`,
              pointerEvents: 'auto',
              display: 'flex', alignItems: 'center', gap: 8,
              maxWidth: 380,
            }}
          >
            <span style={{ color: typeColor[t.type], fontSize: 14 }}>
              {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : t.type === 'warn' ? '⚠' : 'ℹ'}
            </span>
            <span style={{ flex: 1 }}>{t.msg}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PAGE TRANSITION — smooth route changes
// ═══════════════════════════════════════════════════════════

export function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// SKELETON LOADER — better than spinners
// ═══════════════════════════════════════════════════════════

export function SkeletonText({ lines = 3, width = '100%' }) {
  return (
    <div style={{ display: 'grid', gap: 8, width }}>
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
          style={{
            height: 12, borderRadius: 4,
            background: `linear-gradient(90deg, ${bg.subtle}, ${bg.elev1}, ${bg.subtle})`,
            backgroundSize: '200% 100%',
            width: i === lines - 1 ? '60%' : '100%',
          }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// BOTTOM SHEET — mobile-style modal
// ═══════════════════════════════════════════════════════════

export function BottomSheet({ open, onClose, children, title }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 9998,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            }}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
              background: bg.elev1, borderRadius: '20px 20px 0 0',
              borderTop: `1px solid ${C.neon}22`,
              maxHeight: '85vh', overflow: 'auto',
              boxShadow: `0 -20px 60px ${C.neon}10`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
            </div>
            {title && (
              <div style={{
                padding: '4px 20px 12px', display: 'flex', 
                justifyContent: 'space-between', alignItems: 'center',
                borderBottom: `1px solid ${bg.border}`,
              }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
                <button onClick={onClose} style={{
                  background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer', padding: 4,
                }}>
                  <X size={20} />
                </button>
              </div>
            )}
            <div style={{ padding: 20 }}>{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════
// STATS CARD — reusable metric display
// ═══════════════════════════════════════════════════════════

export function StatsCard({ label, value, trend, icon: Icon, color = 'neon', suffix = '' }) {
  const colorValue = C[color] || C.neon;
  return (
    <motion.div
      whileHover={{ y: -2 }}
      style={{
        padding: 16, borderRadius: 12,
        background: bg.elev1, border: `1px solid ${colorValue}22`,
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', fontWeight: 700 }}>
          {label.toUpperCase()}
        </div>
        {Icon && <Icon size={14} color={colorValue} />}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: colorValue, fontFamily: "'JetBrains Mono',monospace" }}>
        {value}{suffix}
      </div>
      {trend !== undefined && (
        <div style={{
          fontSize: 10, color: trend >= 0 ? C.neon : C.magenta, marginTop: 2,
        }}>
          {trend >= 0 ? '↗' : '↘'} {Math.abs(trend)}%
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// SEGMENTED CONTROL — replaces ugly tabs
// ═══════════════════════════════════════════════════════════

export function SegmentedControl({ options, value, onChange, color = 'neon' }) {
  const colorValue = C[color] || C.neon;
  return (
    <div style={{
      display: 'inline-flex', background: bg.subtle, borderRadius: 10, padding: 3,
      border: `1px solid ${bg.border}`,
    }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: '6px 12px', borderRadius: 7,
            background: value === opt.value ? `${colorValue}20` : 'transparent',
            color: value === opt.value ? colorValue : 'rgba(255,255,255,0.5)',
            border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600,
            fontFamily: "'Outfit',system-ui",
            transition: 'all 0.2s',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default {
  RippleButton,
  SwipeableCard,
  CommandPalette,
  ToastContainer,
  toast,
  PageTransition,
  SkeletonText,
  BottomSheet,
  StatsCard,
  SegmentedControl,
};
