import { alpha, createTheme } from '@mui/material/styles'
import { designTokens, INSIGHT_MATRIX_SCALES, MATRIX_CELL_TEXT_COLOR } from './theme/tokens.js'

const DEFAULT_LIGHT_THEME_PRESET_ID = 'sand-light'
const DEFAULT_DARK_THEME_PRESET_ID = 'midnight-dark'

const createSpaceTypography = (
  fontFamily = '"Space Grotesk", "Lexend Deca", system-ui, sans-serif'
) => ({
  htmlFontSize: 15,
  fontSize: 13,
  fontFamily,
  h1: {
    fontWeight: 800,
    letterSpacing: -2.2,
  },
  h2: {
    fontWeight: 800,
    letterSpacing: -1.6,
  },
  h3: {
    fontWeight: 800,
    letterSpacing: -1.1,
    lineHeight: 1.05,
  },
  h4: {
    fontWeight: 700,
    letterSpacing: -0.8,
  },
  h5: {
    fontWeight: 700,
    letterSpacing: -0.6,
  },
  h6: {
    fontWeight: 700,
    letterSpacing: -0.3,
  },
  overline: {
    fontWeight: 800,
    letterSpacing: 1.2,
  },
})

// Design-system typography: Hanken Grotesk headings + Inter body.
const createSystemTypography = () => {
  const base = createSpaceTypography('"Inter", system-ui, sans-serif')
  const heading = { fontFamily: '"Hanken Grotesk", system-ui, sans-serif' }
  return {
    ...base,
    h1: { ...base.h1, ...heading },
    h2: { ...base.h2, ...heading },
    h3: { ...base.h3, ...heading },
    h4: { ...base.h4, ...heading },
    h5: { ...base.h5, ...heading },
    h6: { ...base.h6, ...heading },
  }
}

const lexendTypography = {
  htmlFontSize: 16,
  fontSize: 14,
  fontFamily: '"Lexend Deca", system-ui, sans-serif',
  fontWeightLight: 100,
  fontWeightRegular: 300,
  fontWeightMedium: 500,
  fontWeightBold: 700,
  body1: {
    fontSize: '1rem',
    lineHeight: 1.6,
    letterSpacing: '0.01em',
  },
  caption: {
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    fontSize: '0.75rem',
  },
  h1: {
    fontWeight: 700,
    fontSize: '2rem',
    lineHeight: 1.1,
    letterSpacing: '-0.03em',
  },
  h2: {
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
    fontSize: '1.5rem',
  },
  h3: {
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
    fontSize: '1.25rem',
  },
  h7: {
    fontWeight: 900,
    fontSize: '3rem',
    lineHeight: 1,
    letterSpacing: '-0.03em',
  },
}

const createPalette = ({
  mode,
  primary,
  secondary,
  background,
  text,
  info,
  success,
  warning,
  error,
  alternate,
  brandExtras,
}) => ({
  mode,
  primary,
  secondary,
  alternate,
  brandExtras,
  info,
  success,
  warning,
  error,
  background,
  text,
  divider: alpha(
    mode === 'dark' ? text.primary : primary.dark || text.primary,
    mode === 'dark' ? 0.1 : 0.08
  ),
})

export const THEME_PRESETS = {
  'sand-light': {
    id: 'sand-light',
    labelKey: 'theme.presets.sand',
    // Warm sand paper + deep pitch-teal accent: the light "terrace" sibling of Ember.
    palette: createPalette({
      mode: 'light',
      primary: {
        main: '#1b2740',
        light: '#30466f',
        dark: '#0f172a',
        contrastText: '#f8fafc',
      },
      secondary: {
        main: '#0f766e',
        light: '#117c72',
        dark: '#0b5b55',
        contrastText: '#f3fffc',
      },
      alternate: {
        main: '#dbe8e3',
        light: '#eef6f3',
        dark: '#b5cdc5',
        contrastText: '#0f172a',
      },
      brandExtras: {
        purple: '#6d28d9',
        pink: '#db2777',
        navyBlue: '#1d4ed8',
      },
      info: { main: '#0b6e99' },
      success: { main: '#2e7d32' },
      warning: { main: '#a3620c' },
      error: { main: '#b42318' },
      background: {
        default: '#f1ece1',
        paper: '#fffdf8',
      },
      text: {
        primary: '#0f172a',
        secondary: '#4f5b6b',
      },
    }),
    shape: {
      borderRadius: 10,
    },
    typography: createSystemTypography(),
    pageBackground:
      'radial-gradient(960px 560px at 92% 6%, rgba(15, 118, 110, 0.12) 0%, rgba(15, 118, 110, 0) 58%), radial-gradient(920px 560px at 0% 100%, rgba(176, 124, 52, 0.14) 0%, rgba(176, 124, 52, 0) 52%), linear-gradient(180deg, #f3eee3 0%, #eee8da 100%)',
    custom: {
      surfaces: {
        card: '#fffdf8',
        cardAlt: '#f9f5ec',
        raised: '#e6efea',
        inset: '#efe9dc',
        chipHome: '#d5e8e1',
        chipAway: '#ebe4d5',
        tooltip: '#ffffff',
      },
      tones: {
        heading: '#243246',
        muted: '#515e70',
        subtle: '#46525f',
        accent: '#0d6d65',
        accentStrong: '#0b5b55',
        accentHover: '#0f766e',
        accentSoftBg: alpha('#0d6d65', 0.12),
        onRaised: '#0f172a',
      },
      controls: {
        inputBorder: '#8f8a7e',
        inputBorderHover: '#4f5b6b',
        containedDisabledImage: 'none',
      },
      styleProfile: 'accented',
    },
  },
  'paper-light': {
    id: 'paper-light',
    labelKey: 'theme.presets.paper',
    // Warm off-white paper, stone ink and a burnt-orange accent: the light twin of Ember.
    palette: createPalette({
      mode: 'light',
      primary: {
        main: '#292524',
        light: '#57534e',
        dark: '#1c1917',
        contrastText: '#fafaf9',
      },
      secondary: {
        main: '#ad4f09',
        light: '#b9560b',
        dark: '#8a3f08',
        contrastText: '#fffaf3',
      },
      alternate: {
        main: '#f1ebe4',
        light: '#faf7f3',
        dark: '#e2d8cd',
        contrastText: '#1c1917',
      },
      brandExtras: {
        purple: '#7c3aed',
        pink: '#ec4899',
        navyBlue: '#1d4ed8',
      },
      info: { main: '#0369a1' },
      success: { main: '#2f7d3a' },
      warning: { main: '#a85f00' },
      error: { main: '#b42335' },
      background: {
        default: '#f4f2ee',
        paper: '#ffffff',
      },
      text: {
        primary: '#1c1917',
        secondary: '#57534e',
      },
    }),
    shape: {
      borderRadius: 10,
    },
    typography: createSystemTypography(),
    pageBackground:
      'radial-gradient(900px 520px at 100% 0%, rgba(173, 79, 9, 0.1) 0%, rgba(173, 79, 9, 0) 55%), radial-gradient(920px 540px at 0% 100%, rgba(120, 100, 80, 0.08) 0%, rgba(120, 100, 80, 0) 52%), linear-gradient(180deg, #f6f4f0 0%, #f0ede8 100%)',
    custom: {
      surfaces: {
        card: '#ffffff',
        cardAlt: '#fbf9f6',
        raised: '#f7ebdf',
        inset: '#f2eee8',
        chipHome: '#f7e2cf',
        chipAway: '#ecebe7',
        tooltip: '#ffffff',
      },
      tones: {
        heading: '#3a302a',
        muted: '#5f5650',
        subtle: '#4e4640',
        accent: '#a14a0a',
        accentStrong: '#8a3f08',
        accentHover: '#ad4f09',
        accentSoftBg: alpha('#ad4f09', 0.12),
        onRaised: '#1c1917',
      },
      controls: {
        inputBorder: '#8f8780',
        inputBorderHover: '#57534e',
        containedDisabledImage: 'none',
      },
      styleProfile: 'accented',
    },
  },
  'coast-light': {
    id: 'coast-light',
    labelKey: 'theme.presets.coast',
    // Sea-glass aqua base with an ocean-blue accent (teal now belongs to Sand).
    palette: createPalette({
      mode: 'light',
      primary: {
        main: '#17324d',
        light: '#41627f',
        dark: '#0d2033',
        contrastText: '#f8fbff',
      },
      secondary: {
        main: '#0b63c4',
        light: '#1a6fd0',
        dark: '#094f96',
        contrastText: '#f5faff',
      },
      alternate: {
        main: '#d4e6f4',
        light: '#eef6fb',
        dark: '#a9c9e3',
        contrastText: '#0f2233',
      },
      brandExtras: {
        purple: '#7c3aed',
        pink: '#db2777',
        navyBlue: '#0f5fb8',
      },
      info: { main: '#0e7490' },
      success: { main: '#0f7a5a' },
      warning: { main: '#a8620a' },
      error: { main: '#c0262d' },
      background: {
        default: '#eaf3f6',
        paper: '#fbfdfe',
      },
      text: {
        primary: '#0f2233',
        secondary: '#4c6577',
      },
    }),
    shape: {
      borderRadius: 10,
    },
    typography: createSystemTypography(),
    pageBackground:
      'radial-gradient(980px 540px at 90% 0%, rgba(11, 99, 196, 0.1) 0%, rgba(11, 99, 196, 0) 56%), radial-gradient(940px 540px at 0% 100%, rgba(14, 116, 144, 0.12) 0%, rgba(14, 116, 144, 0) 54%), linear-gradient(180deg, #edf5f8 0%, #e5eff4 100%)',
    custom: {
      surfaces: {
        card: '#fbfdfe',
        cardAlt: '#f2f8fb',
        raised: '#e0edf6',
        inset: '#e9f1f5',
        chipHome: '#d4e6f4',
        chipAway: '#e3ebef',
        tooltip: '#ffffff',
      },
      tones: {
        heading: '#1f3a52',
        muted: '#4b6476',
        subtle: '#3d5668',
        accent: '#0a5cad',
        accentStrong: '#094f96',
        accentHover: '#0b63c4',
        accentSoftBg: alpha('#0b63c4', 0.12),
        onRaised: '#0f2233',
      },
      controls: {
        inputBorder: '#7f93a2',
        inputBorderHover: '#4c6577',
        containedDisabledImage: 'none',
      },
      styleProfile: 'accented',
    },
  },
  'midnight-dark': {
    id: 'midnight-dark',
    labelKey: 'theme.presets.midnight',
    palette: createPalette({
      mode: 'dark',
      primary: {
        main: '#dbe7ff',
        light: '#f5f8ff',
        dark: '#9fb5d1',
        contrastText: '#0f172a',
      },
      secondary: {
        main: '#35b9ab',
        light: '#79ddd2',
        dark: '#1d8479',
        contrastText: '#061311',
      },
      alternate: {
        main: '#17303e',
        light: '#21485d',
        dark: '#11222d',
        contrastText: '#eef2f7',
      },
      brandExtras: {
        purple: '#8b5cf6',
        pink: '#ec4899',
        navyBlue: '#3b82f6',
      },
      info: { main: '#38bdf8' },
      success: { main: '#22c55e' },
      warning: { main: '#f59e0b' },
      error: { main: '#ef4444' },
      background: {
        default: '#0b1118',
        paper: '#121922',
      },
      text: {
        primary: '#eef2f7',
        secondary: '#9ca9ba',
      },
    }),
    shape: {
      borderRadius: 14,
    },
    typography: createSpaceTypography(),
    pageBackground:
      'radial-gradient(960px 560px at 92% 6%, rgba(53, 185, 171, 0.14) 0%, rgba(53, 185, 171, 0) 58%), radial-gradient(920px 560px at 0% 100%, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0) 52%), linear-gradient(180deg, #0c121a 0%, #0a1017 100%)',
    custom: {
      surfaces: {
        card: '#141c26',
        cardAlt: '#1a2c38',
        raised: '#1b2e38',
        inset: '#0f1820',
        chipHome: '#1f3a47',
        chipAway: '#1a222c',
        tooltip: '#0d151d',
      },
      tones: {
        heading: '#b9c7d6',
        muted: '#94a2b3',
        subtle: '#a5b2c2',
        accent: '#4fc9bb',
        accentStrong: '#79ddd2',
        accentHover: '#5fd0c3',
        accentSoftBg: alpha('#4fc9bb', 0.14),
        onRaised: '#eef2f7',
      },
    },
  },
  'forest-dark': {
    id: 'forest-dark',
    labelKey: 'theme.presets.forest',
    palette: createPalette({
      mode: 'dark',
      primary: {
        main: '#d9f7ee',
        light: '#eefcf7',
        dark: '#a7d0c2',
        contrastText: '#091311',
      },
      secondary: {
        main: '#20b486',
        light: '#6dd8b5',
        dark: '#13765b',
        contrastText: '#04110d',
      },
      alternate: {
        main: '#12302a',
        light: '#1c4c43',
        dark: '#0a1c18',
        contrastText: '#eefbf6',
      },
      brandExtras: {
        purple: '#8b5cf6',
        pink: '#ec4899',
        navyBlue: '#38bdf8',
      },
      info: { main: '#38bdf8' },
      success: { main: '#22c55e' },
      warning: { main: '#f59e0b' },
      error: { main: '#ef4444' },
      background: {
        default: '#0b1311',
        paper: '#121b18',
      },
      text: {
        primary: '#ecf8f1',
        secondary: '#a0b9af',
      },
    }),
    shape: {
      borderRadius: 14,
    },
    typography: createSpaceTypography(),
    pageBackground:
      'radial-gradient(960px 560px at 92% 6%, rgba(32, 180, 134, 0.16) 0%, rgba(32, 180, 134, 0) 58%), radial-gradient(920px 560px at 0% 100%, rgba(56, 189, 248, 0.12) 0%, rgba(56, 189, 248, 0) 52%), linear-gradient(180deg, #0c1512 0%, #0a110f 100%)',
    custom: {
      surfaces: {
        card: '#131d1a',
        cardAlt: '#183029',
        raised: '#1a3530',
        inset: '#0e1714',
        chipHome: '#1c3a32',
        chipAway: '#1a2220',
        tooltip: '#0c1512',
      },
      tones: {
        heading: '#b4cdc3',
        muted: '#8fa89e',
        subtle: '#a6bdb3',
        accent: '#3fcb9c',
        accentStrong: '#6dd8b5',
        accentHover: '#4fd1a6',
        accentSoftBg: alpha('#3fcb9c', 0.14),
        onRaised: '#ecf8f1',
      },
    },
  },
  'ember-dark': {
    id: 'ember-dark',
    labelKey: 'theme.presets.ember',
    palette: createPalette({
      mode: 'dark',
      // Like every other dark preset, `primary` must be a LIGHT foreground tone:
      // MUI uses it by default for text/icons/indicators (Tabs, LinearProgress,
      // Checkbox, color="primary" icons, primary.main typography, KPI tones). A
      // near-black primary rendered those as black-on-dark in Ember (#84).
      primary: {
        main: '#efe4da',
        light: '#faf4ee',
        dark: '#cbb8a8',
        contrastText: '#1e1712',
      },
      secondary: {
        main: '#FF6B00',
        light: '#ff9440',
        dark: '#c25200',
        contrastText: '#1a1008',
      },
      alternate: {
        main: '#0A3039',
        light: '#3A727F',
        dark: '#061D22',
        contrastText: '#F5F5F5',
      },
      brandExtras: {
        purple: '#6700C1',
        pink: '#ED2AB2',
        navyBlue: '#0020C1',
      },
      info: { main: '#049EFF' },
      success: { main: '#9aa66a' },
      warning: { main: '#d0a24a' },
      error: { main: '#c15a3a' },
      background: {
        default: '#1e1712',
        paper: '#362a24',
      },
      text: {
        primary: '#f1e9e2',
        secondary: '#88736A',
      },
    }),
    shape: {
      borderRadius: 10,
    },
    typography: createSystemTypography(),
    pageBackground: '#090909',
    custom: {
      // Ember is the reference look of the admin redesign (#144/#147): these
      // values are the original hex literals and must stay pixel-identical.
      surfaces: {
        card: '#1E1E1E',
        cardAlt: '#41312A',
        raised: '#45342C',
        inset: '#261812',
        chipHome: '#41312A',
        chipAway: '#2A2826',
        tooltip: '#261812',
      },
      tones: {
        heading: '#C1ACA3',
        muted: '#88736A',
        subtle: '#A8938A',
        accent: '#DF9F80',
        accentStrong: '#FCB491',
        accentHover: '#f2a074',
        accentSoftBg: 'rgba(223, 159, 128, 0.14)',
        onRaised: '#F4EEE8',
      },
      radius: {
        none: 0,
        sm: '5px',
        lg: '20px',
        full: 9999,
      },
      gradients: {
        brand: 'linear-gradient(160deg, rgba(21,33,55,1) 0%, rgba(22,84,84,1) 85%)',
        cardDepth1:
          'radial-gradient(ellipse 600px 400px at 40% 40%, rgba(61, 61, 65, 0.12) 0%, rgba(4, 4, 6, 0) 60%)',
        cardDepthBig:
          'radial-gradient(ellipse 200% 150% at 50% 0%, rgba(238, 238, 238, 0.1) 0%, rgba(4, 4, 6, 0) 30%)',
      },
      shadows: {
        none: 'none',
        xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
        sm: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
        gradient1:
          'inset -8px 6px 15px 0 rgba(234, 95, 20, 0.5), inset -80px 80px 80px -102px rgba(234, 95, 20, 0.75)',
      },
      transitions: {
        fast: 'all 150ms ease-out',
        base: 'all 250ms ease-out',
        slow: 'all 350ms ease-out',
      },
      styleProfile: 'accented',
    },
  },
}

export const LIGHT_THEME_PRESET_IDS = Object.values(THEME_PRESETS)
  .filter((preset) => preset.palette.mode === 'light')
  .map((preset) => preset.id)

export const DARK_THEME_PRESET_IDS = Object.values(THEME_PRESETS)
  .filter((preset) => preset.palette.mode === 'dark')
  .map((preset) => preset.id)

const hexToRgb = (hex) => {
  if (!hex || typeof hex !== 'string') return '0, 0, 0'
  const cleanHex = hex.replace('#', '')
  const num = parseInt(cleanHex, 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `${r}, ${g}, ${b}`
}

const createCustomTokens = (preset) => {
  const { palette, shape } = preset
  const mode = palette.mode
  const baseRadius = Number(shape.borderRadius || 12)
  const primaryRgb = hexToRgb(palette.primary.main)
  const secondaryRgb = hexToRgb(palette.secondary?.main || palette.primary.main)

  const defaultTokens = {
    radius: {
      none: 0,
      sm: '6px',
      lg: '20px',
      full: 9999,
    },
    dashboard: {
      radius: {
        surface: `${baseRadius}px`,
        surfaceTight: `${Math.max(baseRadius - 2, 8)}px`,
        control: `${Math.max(baseRadius - 4, 8)}px`,
        badge: `${Math.max(baseRadius - 6, 6)}px`,
      },
      borderOpacity: {
        subtle: mode === 'dark' ? 0.12 : 0.08,
        strong: mode === 'dark' ? 0.16 : 0.12,
      },
      shadows: {
        panel:
          mode === 'dark' ? '0 14px 30px rgba(0, 0, 0, 0.3)' : '0 14px 30px rgba(15, 23, 42, 0.08)',
        card:
          mode === 'dark'
            ? '0 14px 28px rgba(0, 0, 0, 0.22)'
            : '0 10px 22px rgba(15, 23, 42, 0.05)',
      },
    },
    gradients: {
      // Brand badge (dashboard rail): a deep tone of the preset into its secondary hue.
      brand: `linear-gradient(160deg, ${
        mode === 'dark'
          ? palette.alternate?.dark || palette.background.default
          : palette.primary.main
      } 0%, ${palette.secondary?.dark || palette.primary.dark} 85%)`,
      cardDepth1:
        mode === 'dark'
          ? `radial-gradient(ellipse 680px 420px at 18% 0%, rgba(${primaryRgb}, 0.12) 0%, rgba(${primaryRgb}, 0) 58%)`
          : 'radial-gradient(ellipse 600px 400px at 40% 40%, rgba(61, 61, 65, 0.08) 0%, rgba(4, 4, 6, 0) 60%)',
      cardDepthBig:
        mode === 'dark'
          ? 'radial-gradient(ellipse 180% 140% at 50% 0%, rgba(255, 255, 255, 0.06) 0%, rgba(4, 4, 6, 0) 34%)'
          : 'radial-gradient(ellipse 200% 150% at 50% 0%, rgba(238, 238, 238, 0.1) 0%, rgba(4, 4, 6, 0) 30%)',
    },
    shadows: {
      none: 'none',
      xs: mode === 'dark' ? '0 1px 2px rgba(0, 0, 0, 0.22)' : '0 1px 2px rgba(0, 0, 0, 0.05)',
      sm:
        mode === 'dark'
          ? '0 6px 16px rgba(0, 0, 0, 0.24)'
          : '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
      md:
        mode === 'dark'
          ? '0 10px 24px rgba(0, 0, 0, 0.3)'
          : '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
      lg:
        mode === 'dark'
          ? '0 18px 36px rgba(0, 0, 0, 0.34)'
          : '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
      xl:
        mode === 'dark'
          ? '0 24px 48px rgba(0, 0, 0, 0.4)'
          : '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
      gradient1:
        mode === 'dark'
          ? `inset 0 1px 0 rgba(255,255,255,0.04), inset -80px 80px 90px -120px rgba(${primaryRgb}, 0.2)`
          : `inset -8px 6px 15px 0 rgba(${primaryRgb}, 0.2), inset -80px 80px 80px -102px rgba(${secondaryRgb}, 0.3)`,
    },
    transitions: {
      fast: 'all 150ms ease-out',
      base: 'all 250ms ease-out',
      slow: 'all 350ms ease-out',
    },
    styleProfile: 'base',
    labels: designTokens.labels,
    insightAccents: designTokens.insightAccents,
    insightMatrix: {
      ...(mode === 'dark' ? INSIGHT_MATRIX_SCALES.dark : INSIGHT_MATRIX_SCALES.light),
      text: mode === 'dark' ? palette.text.primary : MATRIX_CELL_TEXT_COLOR,
      subtext: alpha(mode === 'dark' ? palette.text.primary : MATRIX_CELL_TEXT_COLOR, 0.72),
      cellBorder: alpha(
        mode === 'dark' ? palette.text.primary : MATRIX_CELL_TEXT_COLOR,
        mode === 'dark' ? 0.1 : 0.08
      ),
      samePlayerBackground: alpha(palette.text.secondary, 0.16),
      emptyBackground: alpha(palette.text.secondary, 0.08),
    },
    themeMeta: {
      presetId: preset.id,
      mode: palette.mode,
    },
  }

  return {
    ...defaultTokens,
    ...preset.custom,
    radius: {
      ...defaultTokens.radius,
      ...(preset.custom?.radius || {}),
    },
    dashboard: {
      ...defaultTokens.dashboard,
      ...(preset.custom?.dashboard || {}),
      radius: {
        ...defaultTokens.dashboard.radius,
        ...(preset.custom?.dashboard?.radius || {}),
      },
      borderOpacity: {
        ...defaultTokens.dashboard.borderOpacity,
        ...(preset.custom?.dashboard?.borderOpacity || {}),
      },
      shadows: {
        ...defaultTokens.dashboard.shadows,
        ...(preset.custom?.dashboard?.shadows || {}),
      },
    },
    // Semantic admin surfaces/tones: every preset defines the full set (see
    // THEME_PRESETS[*].custom); theme.test.js enforces keys + WCAG contrast.
    surfaces: { ...(preset.custom?.surfaces || {}) },
    tones: { ...(preset.custom?.tones || {}) },
    gradients: {
      ...defaultTokens.gradients,
      ...(preset.custom?.gradients || {}),
    },
    shadows: {
      ...defaultTokens.shadows,
      ...(preset.custom?.shadows || {}),
    },
    transitions: {
      ...defaultTokens.transitions,
      ...(preset.custom?.transitions || {}),
    },
  }
}

const buildComponentOverrides = (palette, custom, preset) => {
  const mode = palette.mode
  const isDark = mode === 'dark'
  const isAccentedProfile = custom.styleProfile === 'accented'
  const bodyFontFamily =
    preset.typography.fontFamily || '"Space Grotesk", "Lexend Deca", system-ui, sans-serif'

  return {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          scrollBehavior: 'smooth',
          colorScheme: mode,
        },
        body: {
          margin: 0,
          background: preset.pageBackground,
          color: palette.text.primary,
          fontFamily: bodyFontFamily,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        '#root': {
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: '100%',
        },
        a: {
          textDecoration: 'none',
          color: 'inherit',
        },
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        // Visible keyboard-focus indicator across every clickable surface
        // (buttons, nav items, tabs, menu items). Pointer users are unaffected.
        root: {
          '&.Mui-focusVisible': {
            outline: `2px solid ${alpha(palette.secondary.main, 0.9)}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: ({ ownerState }) => {
          const usesDefaultButtonColor =
            ownerState.color === undefined || ownerState.color === 'primary'
          const shouldUseTextColor = usesDefaultButtonColor && ownerState.variant !== 'contained'

          return {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: Math.max((preset.shape.borderRadius || 12) - 4, 8),
            paddingInline: 12,
            minHeight: 34,
            fontSize: '0.88rem',
            boxShadow: 'none',
            transition: 'background-position 300ms ease-out, box-shadow 250ms ease-out',
            // >=44px touch targets on touch devices only (desktop keeps the compact 34px).
            '@media (pointer: coarse)': {
              minHeight: 44,
            },
            ...(shouldUseTextColor ? { color: palette.text.primary } : {}),
          }
        },
        contained: ({ ownerState }) => {
          const usesDefaultButtonColor =
            ownerState.color === undefined || ownerState.color === 'primary'

          return {
            ...(isAccentedProfile
              ? {
                  ...(usesDefaultButtonColor
                    ? {
                        color: palette.secondary.contrastText,
                        backgroundImage: `linear-gradient(135deg, ${palette.secondary.main} 0%, ${palette.secondary.light || palette.secondary.main} 100%)`,
                        '&:hover': {
                          boxShadow: custom.shadows.lg,
                          backgroundImage: `linear-gradient(135deg, ${palette.secondary.dark || palette.secondary.main} 0%, ${palette.secondary.main} 100%)`,
                        },
                        // Presets can drop the accent gradient on disabled
                        // buttons so they read as disabled (Ember keeps it).
                        ...(custom.controls?.containedDisabledImage
                          ? {
                              '&.Mui-disabled': {
                                backgroundImage: custom.controls.containedDisabledImage,
                                boxShadow: 'none',
                              },
                            }
                          : {}),
                      }
                    : {
                        '&:hover': {
                          boxShadow: custom.shadows.lg,
                        },
                      }),
                  boxShadow: custom.shadows.md,
                }
              : {
                  boxShadow: isDark
                    ? '0 16px 28px rgba(0, 0, 0, 0.28)'
                    : '0 16px 30px rgba(15, 23, 42, 0.16)',
                }),
          }
        },
        text: ({ ownerState }) => {
          const usesDefaultButtonColor =
            ownerState.color === undefined || ownerState.color === 'primary'

          return usesDefaultButtonColor
            ? {
                '&:hover': {
                  backgroundColor: alpha(palette.text.primary, isDark ? 0.08 : 0.04),
                },
              }
            : {}
        },
        outlined: ({ ownerState }) => {
          const usesDefaultButtonColor =
            ownerState.color === undefined || ownerState.color === 'primary'

          return {
            borderColor: alpha(palette.text.primary, isDark ? 0.16 : 0.12),
            ...(usesDefaultButtonColor
              ? {
                  color: palette.text.primary,
                  '&:hover': {
                    borderColor: alpha(palette.text.primary, isDark ? 0.24 : 0.18),
                    backgroundColor: alpha(palette.text.primary, isDark ? 0.08 : 0.04),
                  },
                }
              : {}),
          }
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          height: 24,
          borderRadius: Math.max((preset.shape.borderRadius || 12) - 4, 8),
          backdropFilter: 'blur(10px)',
        },
        label: {
          paddingInline: 8,
          fontSize: '0.72rem',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `1px solid ${alpha(palette.text.primary, isDark ? 0.1 : 0.08)}`,
          borderRadius: preset.shape.borderRadius,
          backgroundColor: alpha(palette.background.paper, isDark ? 0.94 : 0.9),
          boxShadow: isDark ? custom.shadows.md : '0 12px 26px rgba(15, 23, 42, 0.07)',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          backgroundImage: isAccentedProfile ? custom.gradients.cardDepthBig : 'none',
          padding: 16,
          margin: 0,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: palette.text.secondary,
          '&.Mui-focused': {
            color: palette.text.primary,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: Math.max((preset.shape.borderRadius || 12) - 2, 10),
          backgroundColor: alpha(
            isDark ? palette.background.default : '#ffffff',
            isDark ? 0.7 : 0.72
          ),
          backdropFilter: 'blur(10px)',
          minHeight: 36,
          // Presets may pin AA (>=3:1) field outlines via `custom.controls`;
          // without it (Ember) the original translucent outline is kept.
          '& fieldset': {
            borderColor:
              custom.controls?.inputBorder ||
              alpha(
                isAccentedProfile ? palette.primary.light : palette.text.primary,
                isDark ? 0.22 : 0.14
              ),
          },
          '&:hover fieldset': {
            borderColor:
              custom.controls?.inputBorderHover ||
              alpha(palette.text.primary, isDark ? 0.28 : 0.18),
          },
          '&.Mui-focused fieldset': {
            borderColor: palette.text.primary,
            borderWidth: isAccentedProfile ? 2 : 1,
          },
        },
        inputSizeSmall: {
          paddingTop: 8,
          paddingBottom: 8,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 40,
        },
        indicator: {
          height: 3,
          borderRadius: 3,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 40,
          textTransform: 'none',
          fontWeight: 700,
          fontSize: '0.88rem',
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          borderRadius: Math.max((preset.shape.borderRadius || 12) - 4, 8),
          backgroundColor: alpha(
            isDark ? palette.background.default : '#ffffff',
            isDark ? 0.66 : 0.7
          ),
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: Math.max((preset.shape.borderRadius || 12) - 6, 8),
          borderColor: alpha(palette.text.primary, isDark ? 0.12 : 0.08),
          textTransform: 'none',
          fontWeight: 700,
          fontSize: '0.82rem',
          paddingBlock: 6,
          '@media (pointer: coarse)': {
            minHeight: 44,
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: Math.max((preset.shape.borderRadius || 12) - 2, 10),
          border: `1px solid ${alpha(palette.text.primary, isDark ? 0.12 : 0.08)}`,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          color: palette.text.secondary,
          paddingTop: 8,
          paddingBottom: 8,
          borderBottomColor: alpha(palette.text.primary, isDark ? 0.12 : 0.08),
        },
        body: {
          paddingTop: 8,
          paddingBottom: 8,
          borderBottomColor: alpha(palette.text.primary, isDark ? 0.08 : 0.06),
        },
        sizeSmall: {
          paddingTop: 6,
          paddingBottom: 6,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: (preset.shape.borderRadius || 12) + 4,
          backgroundColor: alpha(palette.background.paper, isDark ? 0.96 : 0.95),
          backdropFilter: 'blur(18px)',
          boxShadow:
            mode === 'dark'
              ? '0 28px 72px rgba(0, 0, 0, 0.4)'
              : '0 28px 72px rgba(15, 23, 42, 0.2)',
        },
      },
    },
  }
}

export function resolveThemePresetId(selection = DEFAULT_LIGHT_THEME_PRESET_ID) {
  if (selection === 'light') {
    return DEFAULT_LIGHT_THEME_PRESET_ID
  }
  if (selection === 'dark') {
    return DEFAULT_DARK_THEME_PRESET_ID
  }
  return THEME_PRESETS[selection] ? selection : DEFAULT_LIGHT_THEME_PRESET_ID
}

export function createAppTheme(selection = DEFAULT_LIGHT_THEME_PRESET_ID) {
  const presetId = resolveThemePresetId(selection)
  const preset = THEME_PRESETS[presetId]
  const custom = createCustomTokens(preset)

  return createTheme({
    palette: preset.palette,
    spacing: 8,
    shape: preset.shape,
    typography: preset.typography,
    custom,
    components: buildComponentOverrides(preset.palette, custom, preset),
  })
}

const theme = createAppTheme(DEFAULT_LIGHT_THEME_PRESET_ID)

export { DEFAULT_DARK_THEME_PRESET_ID, DEFAULT_LIGHT_THEME_PRESET_ID }

export default theme
