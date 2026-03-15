import { alpha, createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
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
  },
  shape: {
    borderRadius: 20,
  },
  typography: {
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
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background:
            'radial-gradient(960px 560px at 92% 6%, rgba(19, 132, 119, 0.14) 0%, rgba(19, 132, 119, 0) 58%), radial-gradient(920px 560px at 0% 100%, rgba(183, 121, 31, 0.14) 0%, rgba(183, 121, 31, 0) 52%), linear-gradient(180deg, #f4f1e8 0%, #f1eee5 100%)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 999,
          paddingInline: 18,
          minHeight: 42,
        },
        contained: {
          boxShadow: '0 16px 30px rgba(15, 23, 42, 0.16)',
        },
        outlined: {
          borderColor: alpha('#0f172a', 0.12),
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 999,
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(15,23,42,0.08)',
          borderRadius: 24,
          backgroundColor: alpha('#fffdf8', 0.9),
          boxShadow: '0 18px 44px rgba(15, 23, 42, 0.08)',
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
          borderRadius: 18,
          backgroundColor: alpha('#ffffff', 0.72),
          backdropFilter: 'blur(10px)',
          '& fieldset': {
            borderColor: alpha('#0f172a', 0.12),
          },
          '&:hover fieldset': {
            borderColor: alpha('#0f172a', 0.18),
          },
          '&.Mui-focused fieldset': {
            borderWidth: 1,
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 44,
        },
        indicator: {
          height: 3,
          borderRadius: 999,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 44,
          textTransform: 'none',
          fontWeight: 700,
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundColor: alpha('#ffffff', 0.7),
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          borderColor: alpha('#0f172a', 0.08),
          textTransform: 'none',
          fontWeight: 700,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          border: '1px solid rgba(15,23,42,0.08)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          color: '#334155',
          borderBottomColor: alpha('#0f172a', 0.08),
        },
        body: {
          borderBottomColor: alpha('#0f172a', 0.06),
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 28,
          backgroundColor: alpha('#fffdf8', 0.95),
          backdropFilter: 'blur(18px)',
          boxShadow: '0 28px 72px rgba(15, 23, 42, 0.2)',
        },
      },
    },
  },
})

export default theme
