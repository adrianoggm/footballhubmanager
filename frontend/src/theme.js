import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1f2937',
      light: '#334155',
      dark: '#0f172a',
      contrastText: '#f8fafc',
    },
    secondary: {
      main: '#0f766e',
      light: '#14b8a6',
      dark: '#115e59',
      contrastText: '#f0fdfa',
    },
    info: {
      main: '#0ea5a3',
    },
    success: {
      main: '#15803d',
    },
    warning: {
      main: '#b45309',
    },
    error: {
      main: '#b91c1c',
    },
    background: {
      default: '#f7f3e8',
      paper: '#fffdf7',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
    },
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: '"Space Grotesk", system-ui, sans-serif',
    h3: {
      fontWeight: 700,
      letterSpacing: -0.5,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(15,23,42,0.08)',
        },
      },
    },
  },
})

export default theme
