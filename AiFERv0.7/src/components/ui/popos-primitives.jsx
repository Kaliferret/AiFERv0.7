// PopOS primitives — functional, dense, GNOME-inspired
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { POPOS_TOKENS as T } from './popos-tokens';

export function PopCard({ children, padding = 'lg', interactive = false, accent, style = {}, ...props }) {
  const pad = T.space[padding] || T.space.lg;
  return (
    <motion.div
      whileHover={interactive ? { y: -1 } : {}}
      transition={{ duration: 0.12 }}
      style={{
        background: T.bg.raised,
        border: `1px solid ${accent ? T.colors[accent] + '40' : T.border.subtle}`,
        borderRadius: T.radius.lg,
        padding: pad, boxShadow: T.shadow.sm,
        cursor: interactive ? 'pointer' : 'default',
        transition: `all ${T.motion.fast} ${T.motion.ease}`,
        ...style,
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function PopButton({ children, onClick, variant = 'secondary', size = 'md', icon: Icon, disabled, loading, fullWidth, shortcut, ...props }) {
  const sizes = {
    sm: { px: 10, py: 5, fs: T.text.sm, ih: 14 },
    md: { px: 12, py: 7, fs: T.text.sm, ih: 15 },
    lg: { px: 16, py: 10, fs: T.text.md, ih: 16 },
  };
  const s = sizes[size] || sizes.md;
  const variants = {
    primary: { bg: T.colors.pop, fg: '#000', border: 'none' },
    secondary: { bg: T.bg.elevated, fg: T.colors.text, border: `1px solid ${T.border.regular}` },
    ghost: { bg: 'transparent', fg: T.colors.textMuted, border: 'none' },
    danger: { bg: T.colors.danger + '15', fg: T.colors.danger, border: `1px solid ${T.colors.danger}40` },
    success: { bg: T.colors.success + '15', fg: T.colors.success, border: `1px solid ${T.colors.success}40` },
  };
  const v = variants[variant] || variants.secondary;
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: `${s.py}px ${s.px}px`,
        width: fullWidth ? '100%' : 'auto',
        borderRadius: T.radius.md,
        fontSize: s.fs, fontWeight: 500, fontFamily: T.font.sans,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: `all ${T.motion.fast} ${T.motion.ease}`,
        justifyContent: fullWidth ? 'center' : 'flex-start',
        userSelect: 'none',
        background: hover ? (variant === 'primary' ? T.colors.popHover : T.bg.hover) : v.bg,
        color: v.fg, border: v.border,
      }}
      {...props}
    >
      {loading ? (
        <svg width={s.ih} height={s.ih} viewBox="0 0 24 24" style={{ animation: 'aifer-spin 1s linear infinite' }}>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" fill="none" strokeDasharray="30 60" strokeLinecap="round" />
        </svg>
      ) : Icon && <Icon size={s.ih} strokeWidth={1.8} />}
      {children}
      {shortcut && !loading && (
        <code style={{
          marginLeft: 4, padding: '1px 5px', borderRadius: 3,
          fontSize: 9, background: 'rgba(0,0,0,0.2)', color: 'currentColor',
          opacity: 0.6, fontFamily: T.font.mono,
        }}>{shortcut}</code>
      )}
    </button>
  );
}

export function PopInput({ label, icon: Icon, error, hint, fullWidth = true, value, onChange, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ width: fullWidth ? '100%' : 'auto' }}>
      {label && (
        <label style={{
          display: 'block', marginBottom: 4,
          fontSize: T.text.xs, fontWeight: 500,
          color: T.colors.textMuted, fontFamily: T.font.sans,
        }}>{label}</label>
      )}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 10px', background: T.bg.elevated,
        border: `1px solid ${error ? T.colors.danger : focused ? T.colors.pop : T.border.regular}`,
        borderRadius: T.radius.md, transition: `border-color ${T.motion.fast}`,
      }}>
        {Icon && <Icon size={14} color={focused ? T.colors.pop : T.colors.textMuted} />}
        <input
          value={value} onChange={onChange}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            flex: 1, background: 'transparent', border: 'none',
            color: T.colors.text, outline: 'none',
            fontSize: T.text.sm, fontFamily: T.font.sans,
          }}
          {...props}
        />
      </div>
      {error && <div style={{ marginTop: 4, fontSize: T.text.xs, color: T.colors.danger }}>{error}</div>}
      {hint && !error && <div style={{ marginTop: 4, fontSize: T.text.xs, color: T.colors.textDim }}>{hint}</div>}
    </div>
  );
}

export function PopBadge({ children, variant = 'default', size = 'md', dot, pulse }) {
  const variants = {
    default: { bg: T.bg.elevated, fg: T.colors.text, border: T.border.subtle },
    primary: { bg: T.colors.pop + '18', fg: T.colors.pop, border: T.colors.pop + '30' },
    success: { bg: T.colors.success + '18', fg: T.colors.success, border: T.colors.success + '30' },
    danger: { bg: T.colors.danger + '18', fg: T.colors.danger, border: T.colors.danger + '30' },
    warning: { bg: T.colors.warning + '18', fg: T.colors.warning, border: T.colors.warning + '30' },
    info: { bg: T.colors.info + '18', fg: T.colors.info, border: T.colors.info + '30' },
    ai: { bg: T.colors.ai + '18', fg: T.colors.ai, border: T.colors.ai + '30' },
    mesh: { bg: T.colors.mesh + '18', fg: T.colors.mesh, border: T.colors.mesh + '30' },
    ferret: { bg: T.colors.ferret + '18', fg: T.colors.ferret, border: T.colors.ferret + '30' },
    pop: { bg: T.colors.pop + '18', fg: T.colors.pop, border: T.colors.pop + '30' },
  };
  const v = variants[variant] || variants.default;
  const sizes = {
    sm: { fs: 9, px: 5, py: 1 },
    md: { fs: 10, px: 6, py: 2 },
    lg: { fs: 11, px: 8, py: 3 },
  };
  const s = sizes[size] || sizes.md;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: `${s.py}px ${s.px}px`, borderRadius: T.radius.sm,
      background: v.bg, color: v.fg, border: `1px solid ${v.border}`,
      fontSize: s.fs, fontWeight: 600, fontFamily: T.font.sans,
      letterSpacing: '0.02em', textTransform: 'uppercase', lineHeight: 1.2,
    }}>
      {dot && (
        <motion.span
          animate={pulse ? { opacity: [1, 0.3, 1] } : undefined}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ width: 6, height: 6, borderRadius: '50%', background: v.fg }}
        />
      )}
      {children}
    </span>
  );
}

export function SectionHeader({ title, subtitle, actions, icon: Icon }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: T.space.md,
      marginBottom: T.space.md, paddingBottom: T.space.sm,
      borderBottom: `1px solid ${T.border.subtle}`,
    }}>
      {Icon && (
        <div style={{
          width: 32, height: 32, borderRadius: T.radius.md,
          background: T.colors.pop + '15', border: `1px solid ${T.colors.pop}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}><Icon size={16} color={T.colors.pop} /></div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: T.text.lg, fontWeight: 700, color: T.colors.text, fontFamily: T.font.sans }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: T.text.sm, color: T.colors.textMuted, marginTop: 2, fontFamily: T.font.sans }}>
            {subtitle}
          </div>
        )}
      </div>
      {actions && <div style={{ display: 'flex', gap: 6 }}>{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div style={{ padding: T.space.xxl, textAlign: 'center', color: T.colors.textMuted, fontFamily: T.font.sans }}>
      {Icon && (
        <div style={{
          width: 56, height: 56, borderRadius: T.radius.xl,
          background: T.bg.elevated, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: T.space.md,
        }}><Icon size={24} color={T.colors.textDim} /></div>
      )}
      <div style={{ fontSize: T.text.md, fontWeight: 600, color: T.colors.text, marginBottom: T.space.xs }}>{title}</div>
      {description && (
        <div style={{ fontSize: T.text.sm, color: T.colors.textMuted, maxWidth: 360, margin: '0 auto', lineHeight: 1.5, marginBottom: T.space.md }}>
          {description}
        </div>
      )}
      {action}
    </div>
  );
}

export function Kbd({ children }) {
  return (
    <code style={{
      display: 'inline-block', padding: '1px 5px', borderRadius: 3,
      background: T.bg.elevated, border: `1px solid ${T.border.regular}`,
      borderBottomWidth: 2, color: T.colors.textMuted,
      fontSize: 10, fontWeight: 500, fontFamily: T.font.mono,
      lineHeight: 1.3, minWidth: 18, textAlign: 'center',
    }}>{children}</code>
  );
}

export function PopStat({ label, value, unit, trend, icon: Icon, accent = 'pop' }) {
  const c = T.colors[accent] || T.colors.pop;
  return (
    <PopCard padding="md" style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{
          fontSize: T.text.xs, color: T.colors.textDim,
          fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>{label}</div>
        {Icon && <Icon size={14} color={c} strokeWidth={1.8} />}
      </div>
      <div style={{
        fontSize: T.text.xxl, fontWeight: 700,
        color: T.colors.text, fontFamily: T.font.mono, lineHeight: 1.1,
      }}>
        {value}
        {unit && <span style={{ fontSize: T.text.md, color: T.colors.textMuted, fontWeight: 500, marginLeft: 4 }}>{unit}</span>}
      </div>
      {trend !== undefined && (
        <div style={{
          marginTop: 4, fontSize: T.text.xs,
          color: trend >= 0 ? T.colors.success : T.colors.danger, fontWeight: 600,
        }}>{trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%</div>
      )}
    </PopCard>
  );
}

export function Divider({ vertical, label }) {
  if (vertical) return <div style={{ width: 1, background: T.border.subtle, alignSelf: 'stretch' }} />;
  if (label) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: T.space.sm,
        margin: `${T.space.md}px 0`,
        fontSize: T.text.xs, color: T.colors.textDim,
        fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
      }}>
        <div style={{ flex: 1, height: 1, background: T.border.subtle }} />
        {label}
        <div style={{ flex: 1, height: 1, background: T.border.subtle }} />
      </div>
    );
  }
  return <div style={{ height: 1, background: T.border.subtle, margin: `${T.space.md}px 0` }} />;
}

export function PopPanel({ children, maxWidth = 1200, padding = 'lg' }) {
  const pad = T.space[padding] || T.space.lg;
  return (
    <div style={{ padding: pad, maxWidth, margin: '0 auto', fontFamily: T.font.sans }}>
      {children}
    </div>
  );
}

export { T as POPOS_TOKENS };
