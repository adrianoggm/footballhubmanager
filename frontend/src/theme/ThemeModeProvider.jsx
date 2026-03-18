import { CssBaseline, ThemeProvider } from '@mui/material'
import { createContext, useEffect, useMemo, useState } from 'react'
import { createAppTheme } from '../theme.js'

const THEME_MODE_STORAGE_KEY = 'footballhubmanager.theme-mode'
const THEME_MODE_OPTIONS = ['light', 'dark', 'system']

const ThemeModeContext = createContext(null)

const isThemeMode = (value) => THEME_MODE_OPTIONS.includes(value)

const getSystemThemeMode = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const getInitialThemeMode = () => {
  if (typeof window === 'undefined') {
    return 'light'
  }

  try {
    const stored = window.localStorage.getItem(THEME_MODE_STORAGE_KEY)
    if (isThemeMode(stored)) {
      return stored
    }
  } catch {
    // ignore storage access errors
  }

  return 'light'
}

export function ThemeModeProvider({ children }) {
  const [themeMode, setThemeModeState] = useState(getInitialThemeMode)
  const [systemThemeMode, setSystemThemeMode] = useState(getSystemThemeMode)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event) => {
      setSystemThemeMode(event.matches ? 'dark' : 'light')
    }

    setSystemThemeMode(mediaQuery.matches ? 'dark' : 'light')

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  const setThemeMode = (nextMode) => {
    if (!isThemeMode(nextMode)) {
      return
    }
    setThemeModeState(nextMode)
  }

  const resolvedThemeMode = themeMode === 'system' ? systemThemeMode : themeMode

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode)
    } catch {
      // ignore storage access errors
    }

    document.documentElement.dataset.themeMode = resolvedThemeMode
    document.documentElement.style.colorScheme = resolvedThemeMode
  }, [resolvedThemeMode, themeMode])

  const theme = useMemo(() => createAppTheme(resolvedThemeMode), [resolvedThemeMode])

  const value = useMemo(
    () => ({
      themeMode,
      resolvedThemeMode,
      setThemeMode,
      supportedThemeModes: THEME_MODE_OPTIONS,
    }),
    [resolvedThemeMode, themeMode]
  )

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}

export { ThemeModeContext }
