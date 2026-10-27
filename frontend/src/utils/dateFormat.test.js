import { describe, expect, it } from 'vitest'

import { formatDateRange, formatIsoDate } from './dateFormat.js'

describe('formatIsoDate (PL-20)', () => {
  it('formats ISO dates as zero-padded DD/MM/YYYY like the date inputs', () => {
    expect(formatIsoDate('2026-09-01')).toBe('01/09/2026')
  })

  it('ignores a time part and keeps the calendar day', () => {
    expect(formatIsoDate('2026-09-01T23:30:00Z')).toBe('01/09/2026')
  })

  it('renders a dash for empty values', () => {
    expect(formatIsoDate('')).toBe('-')
    expect(formatIsoDate(null)).toBe('-')
  })

  it('formats a season range', () => {
    expect(formatDateRange('2026-09-01', '2027-06-30')).toBe('01/09/2026 - 30/06/2027')
  })
})
