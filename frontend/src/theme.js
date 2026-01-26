import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#111827'
    },
    secondary: {
      main: '#2563eb'
    },
    background: {
      default: '#f4f1ec',
      paper: '#ffffff'
    }
  },
  shape: {
    borderRadius: 14
  },
  typography: {
    fontFamily: '"Space Grotesk", system-ui, sans-serif',
    h3: {
      fontWeight: 700,
      letterSpacing: -0.5
    }
  }
})

export default theme
