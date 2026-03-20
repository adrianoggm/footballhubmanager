import { CssBaseline, ThemeProvider } from '@mui/material'
import { createContext, useEffect, useMemo, useState } from 'react'
import {
  createAppTheme,
  DARK_THEME_PRESET_IDS,
  DEFAULT_DARK_THEME_PRESET_ID,
  DEFAULT_LIGHT_THEME_PRESET_ID,
  LIGHT_THEME_PRESET_IDS,
  resolveThemePresetId,
  THEME_PRESETS,
} from '../theme.js'

const THEME_MODE_STORAGE_KEY = 'footballhubmanager.theme-mode'
const LIGHT_THEME_PRESET_STORAGE_KEY = 'footballhubmanager.theme-preset-light'
const DARK_THEME_PRESET_STORAGE_KEY = 'footballhubmanager.theme-preset-dark'
const THEME_MODE_OPTIONS = ['light', 'dark', 'system']

const ThemeModeContext = createContext(null)

const isThemeMode = (value) => THEME_MODE_OPTIONS.includes(value)
const isThemePreset = (value) => Boolean(value && THEME_PRESETS[value])

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

const getInitialThemePreset = (mode) => {
  if (typeof window === 'undefined') {
    return mode === 'dark' ? DEFAULT_DARK_THEME_PRESET_ID : DEFAULT_LIGHT_THEME_PRESET_ID
  }

  const storageKey =
    mode === 'dark' ? DARK_THEME_PRESET_STORAGE_KEY : LIGHT_THEME_PRESET_STORAGE_KEY
  const fallbackPreset =
    mode === 'dark' ? DEFAULT_DARK_THEME_PRESET_ID : DEFAULT_LIGHT_THEME_PRESET_ID

  try {
    const stored = window.localStorage.getItem(storageKey)
    if (isThemePreset(stored) && THEME_PRESETS[stored].palette.mode === mode) {
      return resolveThemePresetId(stored)
    }
  } catch {
    // ignore storage access errors
  }

  return fallbackPreset
}

export function ThemeModeProvider({ children }) {
  const [themeMode, setThemeModeState] = useState(getInitialThemeMode)
  const [systemThemeMode, setSystemThemeMode] = useState(getSystemThemeMode)
  const [lightThemePresetId, setLightThemePresetId] = useState(() => getInitialThemePreset('light'))
  const [darkThemePresetId, setDarkThemePresetId] = useState(() => getInitialThemePreset('dark'))

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
  const resolvedThemePresetId =
    resolvedThemeMode === 'dark' ? darkThemePresetId : lightThemePresetId
  const theme = useMemo(() => createAppTheme(resolvedThemePresetId), [resolvedThemePresetId])

  const setThemePreset = (nextPresetId) => {
    if (!isThemePreset(nextPresetId)) {
      return
    }

    if (THEME_PRESETS[nextPresetId].palette.mode === 'dark') {
      setDarkThemePresetId(resolveThemePresetId(nextPresetId))
      return
    }

    setLightThemePresetId(resolveThemePresetId(nextPresetId))
  }

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode)
      window.localStorage.setItem(LIGHT_THEME_PRESET_STORAGE_KEY, lightThemePresetId)
      window.localStorage.setItem(DARK_THEME_PRESET_STORAGE_KEY, darkThemePresetId)
    } catch {
      // ignore storage access errors
    }

    document.documentElement.dataset.themeMode = resolvedThemeMode
    document.documentElement.dataset.themePreset = resolvedThemePresetId
    document.documentElement.style.colorScheme = resolvedThemeMode

    const themeColorMeta = document.querySelector('meta[name="theme-color"]')
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', theme.palette.background.default)
    }
  }, [
    darkThemePresetId,
    lightThemePresetId,
    resolvedThemeMode,
    resolvedThemePresetId,
    theme,
    themeMode,
  ])

  const value = useMemo(
    () => ({
      themeMode,
      resolvedThemeMode,
      resolvedThemePresetId,
      lightThemePresetId,
      darkThemePresetId,
      setThemeMode,
      setThemePreset,
      supportedThemeModes: THEME_MODE_OPTIONS,
      lightThemePresetIds: LIGHT_THEME_PRESET_IDS,
      darkThemePresetIds: DARK_THEME_PRESET_IDS,
      availableThemePresetIds:
        resolvedThemeMode === 'dark' ? DARK_THEME_PRESET_IDS : LIGHT_THEME_PRESET_IDS,
    }),
    [darkThemePresetId, lightThemePresetId, resolvedThemeMode, resolvedThemePresetId, themeMode]
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
