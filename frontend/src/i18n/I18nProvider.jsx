import { useCallback, useEffect, useMemo, useState } from 'react'
import { I18nContext } from './context.js'
import { FALLBACK_LANGUAGE, messages, SUPPORTED_LANGUAGES } from './messages.js'

const STORAGE_KEY = 'footballhubmanager.language'

const getFromPath = (source, path) => {
  if (!source) {
    return undefined
  }
  return path.split('.').reduce((current, part) => {
    if (current && typeof current === 'object') {
      return current[part]
    }
    return undefined
  }, source)
}

const interpolate = (value, params) => {
  if (typeof value !== 'string') {
    return value
  }
  return value.replace(/\{(\w+)\}/g, (_, key) => {
    if (params[key] === undefined || params[key] === null) {
      return `{${key}}`
    }
    return String(params[key])
  })
}

const normalizeLanguage = (value) => {
  if (!value) {
    return null
  }
  const normalized = String(value).trim().toLowerCase().split('-')[0]
  if (SUPPORTED_LANGUAGES.includes(normalized)) {
    return normalized
  }
  return null
}

const getInitialLanguage = () => {
  try {
    const stored = normalizeLanguage(localStorage.getItem(STORAGE_KEY))
    if (stored) {
      return stored
    }
  } catch {
    // Ignore localStorage availability errors and continue with browser/fallback language.
  }

  if (typeof navigator !== 'undefined') {
    const browserLanguage = normalizeLanguage(navigator.language)
    if (browserLanguage) {
      return browserLanguage
    }
  }

  return FALLBACK_LANGUAGE
}

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage)

  const setLanguage = useCallback((nextLanguage) => {
    if (!SUPPORTED_LANGUAGES.includes(nextLanguage)) {
      return
    }
    setLanguageState(nextLanguage)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language)
    } catch {
      // Ignore localStorage availability errors.
    }
    document.documentElement.lang = language
  }, [language])

  const t = useCallback(
    (key, params = {}) => {
      const localized = getFromPath(messages[language], key)
      const fallback = getFromPath(messages[FALLBACK_LANGUAGE], key)
      const finalValue =
        typeof localized === 'string'
          ? localized
          : typeof fallback === 'string'
            ? fallback
            : key
      return interpolate(finalValue, params)
    },
    [language]
  )

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      supportedLanguages: SUPPORTED_LANGUAGES
    }),
    [language, setLanguage, t]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
