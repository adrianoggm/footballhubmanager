import { describe, expect, it } from 'vitest'
import {
  TX_TYPES,
  createMoneyFormatter,
  formatSignedMoney,
  formatTrendPct,
  parseAmountToCents,
  parseCategoryPresets,
} from './accountabilityHelpers.js'

describe('accountabilityHelpers', () => {
  it('signs ledger amounts by type', () => {
    const fmt = createMoneyFormatter('EUR')
    expect(formatSignedMoney(fmt, 5000, TX_TYPES.INCOME).startsWith('+')).toBe(true)
    expect(formatSignedMoney(fmt, 42000, TX_TYPES.EXPENSE).startsWith('-')).toBe(true)
  })

  it('parses amounts to integer cents and rejects garbage', () => {
    expect(parseAmountToCents('12.34')).toBe(1234)
    expect(parseAmountToCents('0')).toBe(0)
    expect(parseAmountToCents('abc')).toBeNull()
    expect(parseAmountToCents('')).toBe(0) // Number('') === 0
  })

  it('formats trend percentages with an explicit + and drops empty baselines', () => {
    expect(formatTrendPct(12.4)).toBe('+12.4%')
    expect(formatTrendPct(-3)).toBe('-3%')
    expect(formatTrendPct(0)).toBe('0%')
    expect(formatTrendPct(null)).toBe('')
    expect(formatTrendPct(undefined)).toBe('')
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
