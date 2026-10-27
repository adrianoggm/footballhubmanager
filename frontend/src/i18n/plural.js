// Plural-aware translation (PL-19). A pluralized catalog entry is an object
// keyed by CLDR plural category (`one`, `other`, ...): the category is picked
// with Intl.PluralRules for the active language, falling back to `other`.
// `{count}` is always available for interpolation.

const selectCategory = (language, count) => {
  try {
    return new Intl.PluralRules(language || 'en').select(Number(count))
  } catch {
    return Number(count) === 1 ? 'one' : 'other'
  }
}

export const translatePlural = (t, language, key, count, params = {}) => {
  const category = selectCategory(language, count)
  const values = { ...params, count }
  const categoryKey = `${key}.${category}`
  const translated = t(categoryKey, values)
  return translated === categoryKey ? t(`${key}.other`, values) : translated
}
