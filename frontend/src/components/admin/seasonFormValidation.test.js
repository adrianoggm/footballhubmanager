import { describe, expect, it } from 'vitest'

import {
  hasSeasonFormErrors,
  parsePointsInput,
  validateSeasonForm,
} from './seasonFormValidation.js'

const t = (key) => key
const validForm = () => ({
  start_date: '2026-09-01',
  end_date: '2027-06-30',
  points_win: 3,
  points_draw: 1,
  points_loss: 0,
})

describe('validateSeasonForm', () => {
  it('accepts a valid season', () => {
    expect(hasSeasonFormErrors(validateSeasonForm(validForm(), t))).toBe(false)
  })

  it('rejects negative points (PL-02)', () => {
    const errors = validateSeasonForm({ ...validForm(), points_loss: -1 }, t)
    expect(errors.points_loss).toBe('dashboard.admin.errors.seasonPointsInvalid')
    expect(hasSeasonFormErrors(errors)).toBe(true)
  })

  it('rejects decimal points', () => {
    expect(validateSeasonForm({ ...validForm(), points_win: 1.5 }, t).points_win).toBe(
      'dashboard.admin.errors.seasonPointsInvalid'
    )
  })

  it('requires the points instead of saving a cleared field as 0 (PL-07)', () => {
    const errors = validateSeasonForm({ ...validForm(), points_draw: parsePointsInput('') }, t)
    expect(errors.points_draw).toBe('dashboard.admin.errors.seasonPointsRequired')
  })

  it('rejects an end date before the start date (PL-08)', () => {
    const errors = validateSeasonForm(
      { ...validForm(), start_date: '2026-09-01', end_date: '2026-08-01' },
      t
    )
    expect(errors.end_date).toBe('dashboard.admin.errors.invalidSeasonRange')
  })
})

describe('parsePointsInput (PL-07)', () => {
  it('keeps an empty input empty and parses numbers', () => {
    expect(parsePointsInput('')).toBe('')
    expect(parsePointsInput('3')).toBe(3)
    expect(parsePointsInput('0')).toBe(0)
  })
})
