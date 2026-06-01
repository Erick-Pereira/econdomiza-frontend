/**
 * Fonte única de verdade (SSOT) para tokens de design — simcag / econdomiza-frontend.
 * Sincronizar alterações com: styles.css (:root), tailwind.config.js (@theme extend).
 */
/** Paleta "Professional Audit" — SSOT alinhado a econdomiza/docs Obsidian _frontend */
export const designTokens = {
  colors: {
    brand: {
      primary: '#1a365d',
      primaryDark: '#153e75',
      primaryLight: '#2c5282',
      secondary: '#2c5282',
      accent: '#e9d8fd',
    },
    surface: {
      background: '#f8fafc',
      muted: '#f1f5f9',
      card: '#ffffff',
      border: '#e2e8f0',
      elevation1: 'rgba(26, 54, 93, 0.04)',
      elevation2: 'rgba(26, 54, 93, 0.08)',
    },
    text: {
      main: '#0f172a',
      muted: '#334155',
      disabled: '#64748b',
    },
    status: {
      success: '#319795',
      successLight: '#e6fffa',
      warning: '#ecc94b',
      warningLight: '#fefcbf',
      error: '#f56565',
      errorLight: '#fed7d7',
      info: '#2c5282',
      infoLight: '#ebf8ff',
    },
    state: {
      hover: 'rgba(26, 54, 93, 0.08)',
      active: 'rgba(26, 54, 93, 0.12)',
      focusRing: '#2c5282',
    },
  },
  spacing: {
    xs: '0.25rem', // 4px
    sm: '0.5rem', // 8px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
    '2xl': '3rem', // 48px
    '3xl': '4rem', // 64px
  },
  radius: {
    atomicSm: '6px',
    atomicMd: '8px',
    macroSm: '12px',
    macroMd: '16px',
    full: '9999px',
  },
  typography: {
    fontFamily: {
      primary: "'Inter', system-ui, -apple-system, sans-serif",
      secondary: "'Georgia', serif",
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    },
    fontWeight: {
      header: 700,
      title: 600,
      body: 400,
      muted: 300,
    },
  },
  motion: {
    transitionFast: 'all 0.2s ease-in-out',
    durationFast: '200ms',
    easingDefault: 'ease-in-out',
  },
  layout: {
    contentMax: '1080px',
    sidebarWidth: '252px',
    headerHeight: '70px',
  },
} as const;

export type DesignTokens = typeof designTokens;
