/**
 * PopOS Design Tokens — Pop!_OS 22.04 Cosmic inspired
 * Functional density, GNOME feel, keyboard-first, dark-first
 */
export const POPOS_TOKENS = {
  colors: {
    pop: '#FAA41A', popHover: '#FFB84A', popDeep: '#D88616',
    ferret: '#48B274', ferretBright: '#39FF14',
    info: '#5294E2', success: '#73C48F', warning: '#F8C60F', danger: '#E63946',
    ai: '#9B59B6', mesh: '#3DAEE9', crypto: '#F39C12',
    text: '#F4F4F4', textMuted: '#AAAAAB', textDim: '#6E6E6E',
    sidebarBg: '#1D1D1D', sidebarHover: '#2E2E2E', sidebarActive: '#3D3D3D',
  },
  bg: {
    base: '#141414', raised: '#1E1E1E', raisedAlt: '#252525', elevated: '#2E2E2E',
    overlay: 'rgba(0,0,0,0.6)', hover: 'rgba(255,255,255,0.04)', active: 'rgba(255,255,255,0.08)',
  },
  border: { subtle: '#2A2A2A', regular: '#3A3A3A', strong: '#4A4A4A', accent: 'rgba(250,164,26,0.4)' },
  radius: { sm: 4, md: 6, lg: 8, xl: 10 },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  font: {
    sans: "'Inter', 'Fira Sans', 'Ubuntu', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', 'Ubuntu Mono', monospace",
  },
  text: { xs: 11, sm: 12, base: 13, md: 14, lg: 16, xl: 18, xxl: 22, hero: 28 },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.3)',
    md: '0 2px 8px rgba(0,0,0,0.4)',
    lg: '0 4px 16px rgba(0,0,0,0.5)',
    panel: '0 0 0 1px rgba(255,255,255,0.04), 0 4px 16px rgba(0,0,0,0.3)',
  },
  motion: {
    fast: '120ms', normal: '180ms', slow: '260ms',
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  bp: { mobile: 640, tablet: 960, desktop: 1280, wide: 1600 },
};
export default POPOS_TOKENS;
