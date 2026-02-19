import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
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

const getInitialLanguage = () => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
    return stored
  }
  return FALLBACK_LANGUAGE
}

export const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage)

  const setLanguage = useCallback((nextLanguage) => {
    if (!SUPPORTED_LANGUAGES.includes(nextLanguage)) {
      return
    }
    setLanguageState(nextLanguage)
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language)
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
