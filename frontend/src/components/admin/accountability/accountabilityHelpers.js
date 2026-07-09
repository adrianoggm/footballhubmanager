// Pure helpers for the accountability ledger. Kept framework-free so the money
// and formatting logic can be unit-tested without rendering.

export const TX_TYPES = { INCOME: 'income', EXPENSE: 'expense' }

export const createMoneyFormatter = (currency = 'EUR') =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'EUR',
    maximumFractionDigits: 2,
  })

export const centsToAmount = (cents) => Number(cents || 0) / 100

export const centsToAmountString = (cents) => centsToAmount(cents).toFixed(2)

export const formatMoney = (formatter, cents) => formatter.format(centsToAmount(cents))

// Signed ledger amount, e.g. "+€50.00" for income, "-€420.00" for expense.
export const formatSignedMoney = (formatter, cents, type) => {
  const sign = type === TX_TYPES.EXPENSE ? '-' : '+'
  return `${sign}${formatter.format(centsToAmount(cents))}`
}

export const parseAmountToCents = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return null
  }
  return Math.round(numeric * 100)
}

// "+12.4%" / "-3%"; empty string when there's no baseline (null/undefined/NaN).
export const formatTrendPct = (pct) => {
  if (pct === null || pct === undefined || Number.isNaN(Number(pct))) {
    return ''
  }
  const value = Number(pct)
  const sign = value > 0 ? '+' : ''
  return `${sign}${value}%`
}

// month is 1-12 (as returned by the backend).
export const monthLabel = (year, month) => {
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1))
  return date.toLocaleString(undefined, { month: 'short', year: '2-digit' })
}

export const parseCategoryPresets = (raw) =>
  String(raw || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

export const todayIso = () => new Date().toISOString().slice(0, 10)
