import { alpha, createTheme } from '@mui/material/styles'

const lightPalette = {
  mode: 'light',
  primary: {
    main: '#1b2740',
    light: '#30466f',
    dark: '#0f172a',
    contrastText: '#f8fafc',
  },
  secondary: {
    main: '#0f766e',
    light: '#35b9ab',
    dark: '#115e59',
    contrastText: '#f0fdfa',
  },
  info: {
    main: '#0284c7',
  },
  success: {
    main: '#15803d',
  },
  warning: {
    main: '#b7791f',
  },
  error: {
    main: '#b91c1c',
  },
  background: {
    default: '#f3f0e6',
    paper: '#fffdf8',
  },
  text: {
    primary: '#0f172a',
    secondary: '#526073',
  },
  divider: alpha('#0f172a', 0.08),
}

const darkPalette = {
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
  info: {
    main: '#38bdf8',
  },
  success: {
    main: '#22c55e',
  },
  warning: {
    main: '#f59e0b',
  },
  error: {
    main: '#ef4444',
  },
  background: {
    default: '#0b1118',
    paper: '#121922',
  },
  text: {
    primary: '#eef2f7',
    secondary: '#9ca9ba',
  },
  divider: alpha('#eef2f7', 0.1),
}

const getCustomTokens = (mode) => ({
  radius: {
    none: 0,
    sm: '6px',
    lg: '20px',
    full: 9999,
  },
  gradients: {
    cardDepth1:
      mode === 'dark'
        ? 'radial-gradient(ellipse 680px 420px at 18% 0%, rgba(53, 185, 171, 0.12) 0%, rgba(53, 185, 171, 0) 58%)'
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
        ? 'inset 0 1px 0 rgba(255,255,255,0.04), inset -80px 80px 90px -120px rgba(53, 185, 171, 0.2)'
        : 'inset -8px 6px 15px 0 rgba(234, 95, 20, 0.2), inset -80px 80px 80px -102px rgba(234, 95, 20, 0.3)',
  },
  transitions: {
    fast: 'all 150ms ease-out',
    base: 'all 250ms ease-out',
    slow: 'all 350ms ease-out',
  },
})

const typography = {
  htmlFontSize: 15,
  fontSize: 13,
  fontFamily: '"Space Grotesk", system-ui, sans-serif',
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
}

export function createAppTheme(mode = 'light') {
  const palette = mode === 'dark' ? darkPalette : lightPalette
  const custom = getCustomTokens(mode)

  return createTheme({
    palette,
    spacing: 8,
    shape: {
      borderRadius: 14,
    },
    typography,
    custom,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            scrollBehavior: 'smooth',
            colorScheme: mode,
          },
          body: {
            margin: 0,
            background:
              mode === 'dark'
                ? 'radial-gradient(960px 560px at 92% 6%, rgba(53, 185, 171, 0.14) 0%, rgba(53, 185, 171, 0) 58%), radial-gradient(920px 560px at 0% 100%, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0) 52%), linear-gradient(180deg, #0c121a 0%, #0a1017 100%)'
                : 'radial-gradient(960px 560px at 92% 6%, rgba(19, 132, 119, 0.14) 0%, rgba(19, 132, 119, 0) 58%), radial-gradient(920px 560px at 0% 100%, rgba(183, 121, 31, 0.14) 0%, rgba(183, 121, 31, 0) 52%), linear-gradient(180deg, #f4f1e8 0%, #f1eee5 100%)',
            color: palette.text.primary,
            fontFamily: '"Space Grotesk", system-ui, sans-serif',
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
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 10,
            paddingInline: 12,
            minHeight: 34,
            fontSize: '0.88rem',
          },
          contained: {
            boxShadow:
              mode === 'dark'
                ? '0 16px 28px rgba(0, 0, 0, 0.28)'
                : '0 16px 30px rgba(15, 23, 42, 0.16)',
          },
          outlined: {
            borderColor: alpha(palette.text.primary, mode === 'dark' ? 0.16 : 0.12),
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            height: 24,
            borderRadius: 10,
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
            border: `1px solid ${alpha(palette.text.primary, mode === 'dark' ? 0.14 : 0.08)}`,
            borderRadius: 14,
            backgroundColor: alpha(palette.background.paper, mode === 'dark' ? 0.94 : 0.9),
            boxShadow: mode === 'dark' ? custom.shadows.md : '0 12px 26px rgba(15, 23, 42, 0.07)',
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
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: alpha(
              mode === 'dark' ? palette.background.default : '#ffffff',
              mode === 'dark' ? 0.7 : 0.72
            ),
            backdropFilter: 'blur(10px)',
            minHeight: 36,
            '& fieldset': {
              borderColor: alpha(palette.text.primary, mode === 'dark' ? 0.16 : 0.12),
            },
            '&:hover fieldset': {
              borderColor: alpha(palette.text.primary, mode === 'dark' ? 0.24 : 0.18),
            },
            '&.Mui-focused fieldset': {
              borderWidth: 1,
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
            borderRadius: 10,
            backgroundColor: alpha(
              mode === 'dark' ? palette.background.default : '#ffffff',
              mode === 'dark' ? 0.66 : 0.7
            ),
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            borderColor: alpha(palette.text.primary, mode === 'dark' ? 0.12 : 0.08),
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.82rem',
            paddingBlock: 6,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: `1px solid ${alpha(palette.text.primary, mode === 'dark' ? 0.12 : 0.08)}`,
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
            borderBottomColor: alpha(palette.text.primary, mode === 'dark' ? 0.12 : 0.08),
          },
          body: {
            paddingTop: 8,
            paddingBottom: 8,
            borderBottomColor: alpha(palette.text.primary, mode === 'dark' ? 0.08 : 0.06),
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
            borderRadius: 18,
            backgroundColor: alpha(palette.background.paper, mode === 'dark' ? 0.96 : 0.95),
            backdropFilter: 'blur(18px)',
            boxShadow:
              mode === 'dark'
                ? '0 28px 72px rgba(0, 0, 0, 0.4)'
                : '0 28px 72px rgba(15, 23, 42, 0.2)',
          },
        },
      },
    },
  })
}

const theme = createAppTheme('light')

export default theme
