// Canonical design tokens shared by the MUI theme and by components that need
// raw values outside of an `sx` context (e.g. building chip colors, chart series).
//
// This module is the single source of truth for label colors and insight accents.
// `theme.js` imports these maps into `theme.custom.labels` / `theme.custom.insightAccents`,
// so components can read them from `useTheme()` OR import them directly here.
// Do not redefine these values inline in components — extend them here.

export const DEFAULT_LABEL_COLOR = '#64748B'

export const ROLE_LABEL_COLORS = Object.freeze({
  president: '#B45309',
  coordinator: '#1D4ED8',
  member: '#15803D',
  guest: '#64748B',
})

export const POSITION_LABEL_COLORS = Object.freeze({
  attacker: '#DC2626',
  defender: '#2563EB',
  midfielder: '#16A34A',
  polivalent: '#7C3AED',
  keeper: '#EA580C',
})

// Accent palette for the insights surfaces. `main` drives chart series + chips,
// `soft`/`border` are pre-alpha'd surface fills used by KPI cards.
export const INSIGHT_ACCENTS = Object.freeze({
  matches: {
    main: '#0ea5e9',
    soft: 'rgba(14, 165, 233, 0.12)',
    border: 'rgba(14, 165, 233, 0.34)',
  },
  seasons: {
    main: '#8b5cf6',
    soft: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(139, 92, 246, 0.34)',
  },
  players: {
    main: '#14b8a6',
    soft: 'rgba(20, 184, 166, 0.12)',
    border: 'rgba(20, 184, 166, 0.34)',
  },
  goals: { main: '#ef4444', soft: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.35)' },
  assists: { main: '#2563eb', soft: 'rgba(37, 99, 235, 0.12)', border: 'rgba(37, 99, 235, 0.35)' },
  saves: { main: '#f59e0b', soft: 'rgba(245, 158, 11, 0.14)', border: 'rgba(245, 158, 11, 0.4)' },
})

// Token bag consumed by theme.js → theme.custom. Kept flat and serializable.
export const designTokens = Object.freeze({
  labels: Object.freeze({
    defaultColor: DEFAULT_LABEL_COLOR,
    role: ROLE_LABEL_COLORS,
    position: POSITION_LABEL_COLORS,
  }),
  insightAccents: INSIGHT_ACCENTS,
})

// Resolve a label color from a kind ('role' | 'position') and label key,
// falling back to the neutral default. Case-insensitive.
export function resolveLabelColor(kind, label) {
  const map = kind === 'position' ? POSITION_LABEL_COLORS : ROLE_LABEL_COLORS
  const key = String(label || '')
    .trim()
    .toLowerCase()
  return map[key] || DEFAULT_LABEL_COLOR
}
