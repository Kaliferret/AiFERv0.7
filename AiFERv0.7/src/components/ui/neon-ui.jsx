// AiFER Neon UI — Enhanced design system primitives
// Every component follows Neon Ferret design language: glassmorphism, neon glows, micro-interactions

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useTransform, useMotionValue } from 'framer-motion';

// ═══ TOKENS ═══
export const TOKENS = {
  colors: {
    neon: '#39FF14',
    cyan: '#00E5FF',
    violet: '#B388FF',
    magenta: '#FF0080',
    gold: '#FFD740',
    sky: '#40C4FF',
    orange: '#FF8A40',
  },
  bg: {
    deep: '#06060C',
    card: 'rgba(14,14,24,0.7)',
    elevated: 'rgba(22,22,36,0.85)',
    subtle: 'rgba(255,255,255,0.03)',
    hover: 'rgba(255,255,255,0.06)',
  },
  border: {
    subtle: 'rgba(255,255,255,0.06)',
    active: 'rgba(57,255,20,0.25)',
    strong: 'rgba(255,255,255,0.15)',
  },
  shadow: {
    neon: '0 0 30px rgba(57,255,20,0.2)',
    cyan: '0 0 30px rgba(0,229,255,0.2)',
    violet: '0 0 30px rgba(179,136,255,0.2)',
    soft: '0 4px 24px rgba(0,0,0,0.4)',
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  transition: {
    fast: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    base: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    slow: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
  },
};

// ═══ GLASS CARD ═══
export function GlassCard({ children, accent = 'neon', interactive = false, className = '', style = {}, ...props }) {
  const accentColor = TOKENS.colors[accent] || TOKENS.colors.neon;
  
  const baseStyle = {
    background: TOKENS.bg.card,
    backdropFilter: 'blur(20px) saturate(140%)',
    WebkitBackdropFilter: 'blur(20px) saturate(140%)',
    border: `1px solid ${TOKENS.border.subtle}`,
    borderRadius: TOKENS.radius.lg,
    transition: TOKENS.transition.base,
    ...style,
  };

  if (interactive) {
    return (
      <motion.div
        whileHover={{ y: -2, borderColor: `${accentColor}33`, boxShadow: `0 8px 30px ${accentColor}15` }}
        style={baseStyle}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }

  return <div style={baseStyle} className={className} {...props}>{children}</div>;
}

// ═══ NEON BUTTON ═══
export function NeonButton({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  glow = true,
  loading = false,
  onClick,
  disabled,
  className = '',
  ...props 
}) {
  const variants = {
    primary: {
      bg: `linear-gradient(135deg, ${TOKENS.colors.neon}, ${TOKENS.colors.cyan})`,
      text: '#000',
      shadow: TOKENS.shadow.neon,
    },
    secondary: {
      bg: 'rgba(255,255,255,0.05)',
      text: '#fff',
      border: `1px solid ${TOKENS.border.strong}`,
      shadow: 'none',
    },
    danger: {
      bg: `linear-gradient(135deg, ${TOKENS.colors.magenta}, ${TOKENS.colors.orange})`,
      text: '#fff',
      shadow: `0 0 30px ${TOKENS.colors.magenta}40`,
    },
    ghost: {
      bg: 'transparent',
      text: TOKENS.colors.neon,
      border: `1px dashed ${TOKENS.border.active}`,
      shadow: 'none',
    },
  };

  const sizes = {
    sm: { px: 12, py: 6, font: 11, radius: 8 },
    md: { px: 18, py: 10, font: 13, radius: 10 },
    lg: { px: 24, py: 14, font: 15, radius: 12 },
  };

  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
      style={{
        background: v.bg,
        color: v.text,
        border: v.border || 'none',
        boxShadow: glow ? v.shadow : 'none',
        padding: `${s.py}px ${s.px}px`,
        fontSize: s.font,
        borderRadius: s.radius,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: TOKENS.transition.fast,
        fontFamily: "'Outfit', system-ui, sans-serif",
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        position: 'relative',
        overflow: 'hidden',
      }}
      {...props}
    >
      {loading ? (
        <span style={{
          width: s.font, height: s.font,
          border: `2px solid currentColor`, borderTopColor: 'transparent',
          borderRadius: '50%', animation: 'aifer-spin 0.8s linear infinite',
        }} />
      ) : children}
    </motion.button>
  );
}

// ═══ NEON BADGE ═══
export function NeonBadge({ children, color = 'neon', variant = 'filled', pulse = false }) {
  const c = TOKENS.colors[color] || TOKENS.colors.neon;
  const isFilled = variant === 'filled';
  
  return (
    <span style={{
      fontSize: 10,
      padding: '3px 8px',
      borderRadius: 6,
      background: isFilled ? `${c}18` : 'transparent',
      color: c,
      border: `1px solid ${c}30`,
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      animation: pulse ? 'aifer-pulse 2s ease-in-out infinite' : 'none',
    }}>
      {pulse && (
        <span style={{ 
          width: 6, height: 6, borderRadius: '50%', 
          background: c, boxShadow: `0 0 8px ${c}` 
        }} />
      )}
      {children}
    </span>
  );
}

// ═══ ANIMATED COUNTER ═══
export function AnimatedCounter({ value, duration = 1000, format = (v) => v.toLocaleString() }) {
  const [display, setDisplay] = useState(0);
  const startValueRef = useRef(0);
  const startTimeRef = useRef(null);

  useEffect(() => {
    startValueRef.current = display;
    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = startValueRef.current + (value - startValueRef.current) * eased;
      setDisplay(Math.round(current));
      if (progress === 1) clearInterval(interval);
    }, 16);
    return () => clearInterval(interval);
  }, [value, duration]);

  return <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{format(display)}</span>;
}

// ═══ SHIMMER LOADER ═══
export function Shimmer({ width = '100%', height = 16, radius = 6 }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: `linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 100%)`,
      backgroundSize: '200% 100%',
      animation: 'aifer-shimmer 1.5s ease-in-out infinite',
    }} />
  );
}

// ═══ NEON INPUT ═══
export function NeonInput({ label, icon: Icon, error, ...props }) {
  const [focused, setFocused] = useState(false);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {label}
        </label>
      )}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        background: TOKENS.bg.subtle,
        border: `1px solid ${error ? TOKENS.colors.magenta : focused ? TOKENS.border.active : TOKENS.border.subtle}`,
        borderRadius: TOKENS.radius.md,
        transition: TOKENS.transition.fast,
        boxShadow: focused ? `0 0 0 3px ${TOKENS.colors.neon}15` : 'none',
      }}>
        {Icon && <Icon style={{ width: 16, height: 16, color: focused ? TOKENS.colors.neon : 'rgba(255,255,255,0.3)', margin: '0 0 0 10px' }} />}
        <input
          {...props}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            padding: '10px 12px',
            fontSize: 13,
            color: '#fff',
            fontFamily: 'inherit',
          }}
        />
      </div>
      {error && <div style={{ fontSize: 10, color: TOKENS.colors.magenta }}>{error}</div>}
    </div>
  );
}

// ═══ PROGRESS BAR ═══
export function NeonProgress({ value = 0, max = 100, color = 'neon', showLabel = true, height = 6 }) {
  const pct = Math.min(100, (value / max) * 100);
  const c = TOKENS.colors[color] || TOKENS.colors.neon;
  
  return (
    <div style={{ width: '100%' }}>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>{value}/{max}</span>
          <span style={{ color: c, fontFamily: "'JetBrains Mono'", fontWeight: 700 }}>{pct.toFixed(0)}%</span>
        </div>
      )}
      <div style={{
        height, background: 'rgba(255,255,255,0.04)', borderRadius: height/2, overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${c}, ${c}88)`,
            borderRadius: height/2,
            boxShadow: `0 0 10px ${c}66`,
          }}
        />
      </div>
    </div>
  );
}

// ═══ ANIMATED LIST ═══
export function StaggerList({ children, delay = 0.05 }) {
  return (
    <motion.div initial="hidden" animate="visible" variants={{
      visible: { transition: { staggerChildren: delay } },
    }}>
      {React.Children.map(children, (child, i) => (
        <motion.div
          key={i}
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 18 } },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

// ═══ FLOATING ORB (decorative) ═══
export function FloatingOrb({ color = 'neon', size = 100, position = { top: 0, left: 0 } }) {
  const c = TOKENS.colors[color] || TOKENS.colors.neon;
  
  return (
    <motion.div
      animate={{
        y: [0, -20, 0],
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${c}33 0%, transparent 70%)`,
        filter: 'blur(20px)',
        pointerEvents: 'none',
        ...position,
      }}
    />
  );
}

// ═══ TOOLTIP ═══
export function NeonTooltip({ children, content, position = 'top' }) {
  const [show, setShow] = useState(false);
  
  const positions = {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%) translateY(-8px)' },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%) translateY(8px)' },
    left: { right: '100%', top: '50%', transform: 'translateY(-50%) translateX(-8px)' },
    right: { left: '100%', top: '50%', transform: 'translateY(-50%) translateX(8px)' },
  };

  return (
    <div 
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              ...positions[position],
              background: TOKENS.bg.elevated,
              border: `1px solid ${TOKENS.border.strong}`,
              borderRadius: TOKENS.radius.sm,
              padding: '6px 10px',
              fontSize: 11,
              color: '#fff',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 1000,
              boxShadow: TOKENS.shadow.soft,
            }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══ STYLES (injected once) ═══
export function NeonGlobalStyles() {
  return (
    <style>{`
      @keyframes aifer-shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes aifer-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
      @keyframes aifer-spin {
        to { transform: rotate(360deg); }
      }
      @keyframes aifer-float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-8px); }
      }
      @keyframes aifer-glow {
        0%, 100% { filter: drop-shadow(0 0 8px rgba(57,255,20,0.5)); }
        50% { filter: drop-shadow(0 0 20px rgba(57,255,20,0.8)); }
      }
    `}</style>
  );
}

export default {
  GlassCard,
  NeonButton,
  NeonBadge,
  NeonInput,
  NeonProgress,
  NeonTooltip,
  AnimatedCounter,
  Shimmer,
  StaggerList,
  FloatingOrb,
  NeonGlobalStyles,
  TOKENS,
};
