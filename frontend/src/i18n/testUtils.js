import { messages } from './messages.js'

// Test-only translator that resolves real messages (with {var} interpolation)
// so tests can assert on the copy users actually see in a given language.
export const createTestT =
  (language = 'en') =>
  (key, params = {}) => {
    const value = key
      .split('.')
      .reduce(
        (node, part) => (node && typeof node === 'object' ? node[part] : undefined),
        messages[language]
      )
    if (typeof value !== 'string') {
      return key
    }
    return value.replace(/\{(\w+)\}/g, (match, name) =>
      params[name] === undefined || params[name] === null ? match : String(params[name])
    )
  }

export const createTestI18nValue = (language = 'en') => ({
  language,
  setLanguage: () => {},
  t: createTestT(language),
  supportedLanguages: ['en', 'es'],
})
