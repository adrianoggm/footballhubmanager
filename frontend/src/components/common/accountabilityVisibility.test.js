import { describe, expect, it } from 'vitest'

import {
  memberLedgerTypes,
  resolveBudgetVisibility,
  resolveExpensesVisibility,
} from './accountabilityVisibility.js'

describe('accountability visibility resolvers', () => {
  it('reads the flat API response fields', () => {
    const accountability = {
      budget_visibility: 'full',
      expenses_visibility: 'private',
    }

    expect(resolveBudgetVisibility(accountability)).toBe('full')
    expect(resolveExpensesVisibility(accountability)).toBe('private')
  })

  it('keeps compatibility with the legacy nested shape', () => {
    const accountability = {
      transparency: {
        budget: 'private',
        expenses: 'full',
      },
    }

    expect(resolveBudgetVisibility(accountability)).toBe('private')
    expect(resolveExpensesVisibility(accountability)).toBe('full')
  })

  it('falls back to summary for missing or invalid values', () => {
    expect(resolveBudgetVisibility(null)).toBe('summary')
    expect(resolveExpensesVisibility({ expenses_visibility: 'public' })).toBe('summary')
  })

  it('lists the ledger types a member can see in detail (MO-13)', () => {
    expect(memberLedgerTypes('full', 'full')).toEqual(['income', 'expense'])
    expect(memberLedgerTypes('full', 'summary')).toEqual(['income'])
    expect(memberLedgerTypes('private', 'full')).toEqual(['expense'])
    expect(memberLedgerTypes('summary', 'summary')).toEqual([])
  })
})
