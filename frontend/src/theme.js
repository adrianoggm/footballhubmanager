import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#101820',
      light: '#435363', 
      dark: '#0A0E13',  
      contrastText: '#F5F5F5', 
    },
    secondary: {
      main: '#da4416',
      light: '#F7A77F',
      dark: '#914119',
      contrastText: '#101820',
    },
    //To use this color => sx={{ bgcolor: 'alternate.main' }}
    alternate: {
      main: '#0A3039',
      light: '#3A727F',
      dark: '#061D22',
      contrastText: '#F5F5F5',
    },
    // Semantic colors
    info: {
      main: '#00ACC1',
    },
    success: {
      main: '#00C10D',
    },
    warning: {
      main: '#FFC107',
    },
    error: {
      main: '#C10000',
    },
    // + support semantical colors
    brandExtras: {
      purple: '#6700C1',
      pink: '#ED2AB2',
      navyBlue: '#0020C1'
    },
    // reading colors
    background: {
      default: '#0F0F0F',
      paper: '#151515',
    },
    text: {
      primary: '#F5F5F5',
      secondary: '#BABABA',
    },
  },
  // p: X will have a spacing based in 8
  spacing: 8,

  shape: {
    borderRadius: 10,
  },

  typography: {
  fontFamily: '"Lexend Deca", system-ui, sans-serif',

  // GLOBAL TOKENS
  fontWeightLight: 100,
  fontWeightRegular: 300, 
  fontWeightMedium: 500,
  fontWeightBold: 700,

  // Body and tags
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
  h3: {
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: '-0.02em', 
    fontSize: '1.25rem',
  },
  h2: {
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.02em', 
    fontSize: '1.5rem',
  },
  h1: {
    fontWeight: 700,
    fontSize: '2rem',
    lineHeight: 1.1,
    letterSpacing: '-0.03em',
  },
  // This is DISPLAY, Material UI doesn't support it, so i'm using an empty one
  h7: {
    fontWeight: 900,
    fontSize: '3rem',
    lineHeight: 1,
    letterSpacing: '-0.03em',
  }, 
},

  // CUSTOM TOKENS ====================================================
  custom: {
    radius: {
      none: 0, sm: 5, lg: 20, full: 9999,
    },
    gradients: {
      cardDepth1: 'radial-gradient(ellipse 600px 400px at 40% 40%, rgba(61, 61, 65, 0.12) 0%, rgba(4, 4, 6, 0) 60%)',
      cardDepthBig: 'radial-gradient(ellipse 200% 150% at 50% 0%, rgba(238, 238, 238, 0.1) 0%, rgba(4, 4, 6, 0) 30%)',
    },
    shadows: {
      none: 'none',
      xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
      sm: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
      md: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
      xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
      // To use gradient1 => sx={{ boxShadow: (theme) => theme.custom.shadows.gradient1 }}
      gradient1: 'inset -8px 6px 15px 0 rgba(234, 95, 20, 0.5), inset -80px 80px 80px -102px rgba(234, 95, 20, 0.75)',
    },
    transitions: {
      fast: 'all 150ms ease-out',
      base: 'all 250ms ease-out',
      slow: 'all 350ms ease-out',
    }
  },
  // ===================================================================

  components: {
    // Reset CSS
    MuiCssBaseline: {
      styleOverrides: {
        html: { scrollBehavior: 'smooth' },
        body: {
          margin: 0,
          padding: 0,
          fontFamily: '"Lexend Deca", system-ui, sans-serif',
          fontWeight: 300,
          '-webkit-font-smoothing': 'antialiased',
          '-moz-osx-font-smoothing': 'grayscale',
        },
        '#root': {
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: '100%',
        },
        a: { textDecoration: 'none', color: 'inherit' }
      },
    },

    // DEFAULT COMPONENTS
    MuiButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 'none',
          background: `linear-gradient(to left, ${theme.palette.secondary.main} 50%, ${theme.palette.secondary.light} 50%) right`,
          backgroundSize: '220% 100%',
          transition: 'background-position 300ms ease-out, box-shadow 250ms ease-out',
          '&:hover': {
            backgroundPosition: 'left',
            boxShadow: theme.custom.shadows.md,
          },
        }),
        contained: ({ theme }) => ({
          '&:hover': {
            boxShadow: theme.custom.shadows.lg,
          },
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundImage: 'none',
          transition: theme.custom.transitions.fast,
          boxShadow: theme.custom.shadows.sm,
          border: `2px solid ${theme.palette.secondary.main}`,
          
        }),
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundImage: theme.custom.gradients.cardDepthBig,
          padding: "16px",
          margin: 0,
        }),
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.primary.secondary,
          '&.Mui-focused': {
            color: theme.palette.text.primary,
          },
        }),
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: theme.palette.primary.light,
              transition: theme.custom.transitions.base,
            },
            '&:hover fieldset': {
              borderColor: theme.palette.text.primary,
            },
            '&.Mui-focused fieldset': {
              borderColor: theme.palette.text.primary,
              borderWidth: 2,
            },
          },
          '& .MuiOutlinedInput-input': {
            color: theme.palette.text.primary,
            '&:focus': {
              color: theme.palette.text.primary,
            },
          },
          '& input[type="color"]': {
            cursor: 'pointer',
            padding: '2px 8px',
          },
        }),
      },
    },
  },
});


export default theme
