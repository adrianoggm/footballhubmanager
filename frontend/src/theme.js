import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: 'var(--fh-color-primary-main)',
      light: 'var(--fh-color-primary-light)',
      dark: 'var(--fh-color-primary-dark)',
      contrastText: '#f8fafc',
    },
    secondary: {
      main: 'var(--fh-color-secondary-main)',
      light: 'var(--fh-color-secondary-light)',
      dark: 'var(--fh-color-secondary-dark)',
      contrastText: '#f0fdfa',
    },
    info: {
      main: 'var(--fh-color-info-main)',
    },
    success: {
      main: 'var(--fh-color-success-main)',
    },
    warning: {
      main: 'var(--fh-color-warning-main)',
    },
    error: {
      main: 'var(--fh-color-error-main)',
    },
    background: {
      default: 'var(--fh-color-surface-page)',
      paper: 'var(--fh-color-surface-card)',
    },
    text: {
      primary: 'var(--fh-color-text-primary)',
      secondary: 'var(--fh-color-text-secondary)',
    },
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: 'var(--fh-font-family)',
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
