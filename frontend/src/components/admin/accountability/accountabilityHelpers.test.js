import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AMOUNT_RULES,
  MAX_AMOUNT_CENTS,
  TX_TYPES,
  accountabilityErrorMessage,
  countKey,
  createMoneyFormatter,
  currencySymbol,
  formatLedgerDate,
  formatPercent,
  formatSignedMoney,
  formatTrendPct,
  monthLabel,
  parseAmountToCents,
  parseCategoryPresets,
  toIntlLocale,
  todayIso,
  validateAmountInput,
} from './accountabilityHelpers.js'

// Intl separates the number and the % / currency with narrow/no-break spaces.
const plain = (value) => value.replace(/[\u00a0\u202f]/g, ' ')

describe('accountabilityHelpers', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('signs ledger amounts by type', () => {
    const fmt = createMoneyFormatter('EUR', 'en-GB')
    expect(formatSignedMoney(fmt, 5000, TX_TYPES.INCOME).startsWith('+')).toBe(true)
    expect(formatSignedMoney(fmt, 42000, TX_TYPES.EXPENSE).startsWith('-')).toBe(true)
  })

  it('parses amounts to integer cents and rejects garbage', () => {
    expect(parseAmountToCents('12.34')).toBe(1234)
    expect(parseAmountToCents('0')).toBe(0)
    expect(parseAmountToCents('abc')).toBeNull()
  })

  it('treats an empty amount as missing, not as 0 (MO-03)', () => {
    expect(parseAmountToCents('')).toBeNull()
    expect(parseAmountToCents('   ')).toBeNull()
    expect(parseAmountToCents(undefined)).toBeNull()
  })

  it('validates transaction amounts: required, positive and bounded (MO-03, MO-04)', () => {
    const rule = AMOUNT_RULES.POSITIVE
    expect(validateAmountInput('', rule)).toEqual({ cents: null, error: 'amountRequired' })
    expect(validateAmountInput('abc', rule)).toEqual({ cents: null, error: 'amountRequired' })
    expect(validateAmountInput('0', rule)).toEqual({ cents: 0, error: 'amountPositive' })
    expect(validateAmountInput('-5', rule)).toEqual({ cents: -500, error: 'amountPositive' })
    expect(validateAmountInput('99999999999999999', rule).error).toBe('amountTooLarge')
    expect(validateAmountInput('12.5', rule)).toEqual({ cents: 1250, error: null })
    expect(validateAmountInput(String(MAX_AMOUNT_CENTS / 100), rule).error).toBeNull()
  })

  it('validates member amounts: zero allowed, negatives rejected (MO-06)', () => {
    const rule = AMOUNT_RULES.NON_NEGATIVE
    expect(validateAmountInput('0', rule)).toEqual({ cents: 0, error: null })
    expect(validateAmountInput('-1', rule).error).toBe('amountNegative')
    expect(validateAmountInput('1e20', rule).error).toBe('amountTooLarge')
  })

  it('maps the app language to an Intl locale (MO-08)', () => {
    expect(toIntlLocale('es')).toBe('es-ES')
    expect(toIntlLocale('en')).toBe('en-GB')
    expect(toIntlLocale(undefined)).toBe('en-GB')
  })

  it('formats money with the app locale, not the browser one (MO-08)', () => {
    expect(plain(createMoneyFormatter('EUR', 'es-ES').format(1234.5))).toBe('1234,50 €')
    expect(createMoneyFormatter('EUR', 'en-GB').format(1234.5)).toBe('€1,234.50')
  })

  it('formats percentages with the locale decimal separator (MO-08)', () => {
    expect(plain(formatPercent(64.6, 'es-ES'))).toBe('64,6 %')
    expect(formatPercent(64.6, 'en-GB')).toBe('64.6%')
    expect(formatPercent(null, 'en-GB')).toBe('')
  })

  it('formats trend percentages with an explicit sign and drops empty baselines', () => {
    expect(formatTrendPct(12.4, 'en-GB')).toBe('+12.4%')
    expect(formatTrendPct(-3, 'en-GB')).toBe('-3%')
    expect(formatTrendPct(0, 'en-GB')).toBe('0%')
    expect(plain(formatTrendPct(6.6, 'es-ES'))).toBe('+6,6 %')
    expect(formatTrendPct(null, 'en-GB')).toBe('')
    expect(formatTrendPct(undefined, 'en-GB')).toBe('')
  })

  it('labels months and ledger dates in the app locale (MO-08)', () => {
    expect(monthLabel(2026, 3, 'es-ES')).toMatch(/mar/i)
    expect(monthLabel(2026, 3, 'en-GB')).toMatch(/Mar/)
    expect(formatLedgerDate('2026-03-01', 'es-ES')).toMatch(/^01 mar/)
    expect(formatLedgerDate('2026-03-01', 'en-GB')).toBe('01 Mar 2026')
    expect(formatLedgerDate('', 'en-GB')).toBe('-')
  })

  it('uses the local calendar day for the default date (MO-09)', () => {
    vi.useFakeTimers()
    vi.stubEnv('TZ', 'Europe/Madrid')
    // 00:30 local time on 5 March: toISOString() would already/still be another day
    // in any non-UTC zone; the local date must be 2026-03-05.
    vi.setSystemTime(new Date(2026, 2, 5, 0, 30))
    expect(todayIso()).toBe('2026-03-05')
  })

  it('shows the currency symbol instead of the ISO code (MO-16)', () => {
    expect(currencySymbol('EUR', 'es-ES')).toBe('€')
    expect(currencySymbol('EUR', 'en-GB')).toBe('€')
  })

  it('picks singular/plural message keys (MO-16)', () => {
    expect(countKey('a.pending', 1)).toBe('a.pendingOne')
    expect(countKey('a.pending', 0)).toBe('a.pendingOther')
    expect(countKey('a.pending', 3)).toBe('a.pendingOther')
  })

  it('translates known accountability API errors (MO-07)', () => {
    const t = (key) => `t:${key}`
    const prefix = 'dashboard.admin.accountability.errors'
    expect(accountabilityErrorMessage(new Error('Amount out of range'), t)).toBe(
      `t:${prefix}.amountOutOfRange`
    )
    expect(accountabilityErrorMessage(new Error('Invalid accountability data'), t)).toBe(
      `t:${prefix}.invalidData`
    )
    const unprocessable = Object.assign(new Error('occurred_on: Input should be a valid date'), {
      status: 422,
    })
    expect(accountabilityErrorMessage(unprocessable, t)).toBe(`t:${prefix}.invalidData`)
    expect(accountabilityErrorMessage(new Error('Something else'), t)).toBe('Something else')
    expect(accountabilityErrorMessage(null, t)).toBe('t:dashboard.common.errors.generic')
  })

  it('splits and trims category presets', () => {
    expect(parseCategoryPresets('General, Equipment ,,Referee')).toEqual([
      'General',
      'Equipment',
      'Referee',
    ])
    expect(parseCategoryPresets('')).toEqual([])
  })
})
