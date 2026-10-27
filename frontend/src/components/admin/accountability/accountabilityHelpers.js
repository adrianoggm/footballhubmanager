// Pure helpers for the accountability ledger. Kept framework-free so the money
// and formatting logic can be unit-tested without rendering.

export const TX_TYPES = { INCOME: 'income', EXPENSE: 'expense' }

// Mirrors the backend bound (99,999,999.99). Larger values are rejected client-side
// before they reach the API.
export const MAX_AMOUNT_CENTS = 9_999_999_999

// Concept / entity column length in the ledger table.
export const MAX_TEXT_LENGTH = 160

export const AMOUNT_RULES = { POSITIVE: 'positive', NON_NEGATIVE: 'nonNegative' }

const INTL_LOCALES = { es: 'es-ES', en: 'en-GB' }

// App language ('es' | 'en') -> Intl locale. Formatting follows the app language,
// not the browser locale.
export const toIntlLocale = (language) => INTL_LOCALES[language] || INTL_LOCALES.en

export const createMoneyFormatter = (currency = 'EUR', locale = INTL_LOCALES.en) =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency || 'EUR',
    maximumFractionDigits: 2,
  })

// Short money for chart axes ("1,2 mil €" / "€1.2K").
export const createAxisMoneyFormatter = (currency = 'EUR', locale = INTL_LOCALES.en) =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency || 'EUR',
    notation: 'compact',
    maximumFractionDigits: 1,
  })

export const currencySymbol = (currency = 'EUR', locale = INTL_LOCALES.en) => {
  const parts = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency || 'EUR',
  }).formatToParts(0)
  return parts.find((part) => part.type === 'currency')?.value || currency
}

export const centsToAmount = (cents) => Number(cents || 0) / 100

export const centsToAmountString = (cents) => centsToAmount(cents).toFixed(2)

export const formatMoney = (formatter, cents) => formatter.format(centsToAmount(cents))

// Signed ledger amount, e.g. "+€50.00" for income, "-€420.00" for expense.
export const formatSignedMoney = (formatter, cents, type) => {
  const sign = type === TX_TYPES.EXPENSE ? '-' : '+'
  return `${sign}${formatter.format(centsToAmount(cents))}`
}

// Empty / blank / non-numeric input -> null (Number('') would silently be 0).
export const parseAmountToCents = (value) => {
  const raw = String(value ?? '').trim()
  if (!raw) {
    return null
  }
  const numeric = Number(raw)
  if (!Number.isFinite(numeric)) {
    return null
  }
  return Math.round(numeric * 100)
}

// Returns { cents, error } where error is a message key suffix under
// `dashboard.admin.accountability.validation` (or null when valid).
export const validateAmountInput = (value, rule) => {
  const cents = parseAmountToCents(value)
  if (cents === null) {
    return { cents, error: 'amountRequired' }
  }
  if (Math.abs(cents) > MAX_AMOUNT_CENTS) {
    return { cents, error: 'amountTooLarge' }
  }
  if (rule === AMOUNT_RULES.POSITIVE && cents <= 0) {
    return { cents, error: 'amountPositive' }
  }
  if (rule === AMOUNT_RULES.NON_NEGATIVE && cents < 0) {
    return { cents, error: 'amountNegative' }
  }
  return { cents, error: null }
}

const isMissingNumber = (value) =>
  value === null || value === undefined || Number.isNaN(Number(value))

// 64.6 -> "64,6 %" (es-ES) / "64.6%" (en-GB); '' when missing.
export const formatPercent = (pct, locale = INTL_LOCALES.en) => {
  if (isMissingNumber(pct)) {
    return ''
  }
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(
    Number(pct) / 100
  )
}

// "+12.4%" / "-3%" / "0%"; empty string when there's no baseline.
export const formatTrendPct = (pct, locale = INTL_LOCALES.en) => {
  if (isMissingNumber(pct)) {
    return ''
  }
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  }).format(Number(pct) / 100)
}

// month is 1-12 (as returned by the backend).
export const monthLabel = (year, month, locale = INTL_LOCALES.en) => {
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1))
  return date.toLocaleString(locale, { month: 'short', year: '2-digit', timeZone: 'UTC' })
}

// 'YYYY-MM-DD' calendar date -> "01 Mar 2026" in the app locale. Parsed as a
// calendar day (UTC) so the browser time zone can't shift it to the previous day.
export const formatLedgerDate = (value, locale = INTL_LOCALES.en) => {
  if (!value) {
    return '-'
  }
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
}

// `${base}One` for exactly 1, `${base}Other` otherwise (EN and ES share this rule).
export const countKey = (base, count) => `${base}${Number(count) === 1 ? 'One' : 'Other'}`

export const parseCategoryPresets = (raw) =>
  String(raw || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const pad2 = (value) => String(value).padStart(2, '0')

// Today's LOCAL calendar date (toISOString() would use UTC and propose yesterday
// right after midnight in Spain).
export const todayIso = () => {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}

const API_ERROR_KEYS = {
  'Amount out of range': 'amountOutOfRange',
  'Invalid accountability data': 'invalidData',
  'Member not found': 'memberNotFound',
  'Transaction not found': 'transactionNotFound',
  'Admin does not manage this pena': 'accessDenied',
}

// Readable, translated message for an accountability API error.
export const accountabilityErrorMessage = (error, t) => {
  if (!error) {
    return t('dashboard.common.errors.generic')
  }
  const key =
    API_ERROR_KEYS[error.message] ||
    (error.status === 422 ? API_ERROR_KEYS['Invalid accountability data'] : null)
  if (key) {
    return t(`dashboard.admin.accountability.errors.${key}`)
  }
  return error.message || t('dashboard.common.errors.generic')
}
