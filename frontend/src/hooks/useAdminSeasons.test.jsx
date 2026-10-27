/** @vitest-environment happy-dom */
import { act, renderHook } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { useAdminSeasons } from './useAdminSeasons.js'

const t = (key) => key

const initialForm = () => ({
  start_date: '2026-09-01',
  end_date: '2027-06-30',
  points_win: 3,
  points_draw: 1,
  points_loss: 0,
})

const useHarness = () => {
  const [seasonForm, setSeasonForm] = useState(initialForm)
  const [selectedSeasonForm, setSelectedSeasonForm] = useState(initialForm)
  const seasons = useAdminSeasons({ setSeasonForm, setSelectedSeasonForm, t })
  return { seasonForm, selectedSeasonForm, ...seasons }
}

describe('useAdminSeasons', () => {
  it('keeps a cleared points field empty instead of saving 0 (PL-07)', () => {
    const { result } = renderHook(useHarness)

    act(() => result.current.onCreateSeasonField('points_win')({ target: { value: '' } }))
    expect(result.current.seasonForm.points_win).toBe('')

    let valid
    act(() => {
      valid = result.current.validateCreateSeasonForm(result.current.seasonForm)
    })
    expect(valid).toBe(false)
    expect(result.current.createSeasonErrors.points_win).toBe(
      'dashboard.admin.errors.seasonPointsRequired'
    )
  })

  it('rejects negative points on create (PL-02)', () => {
    const { result } = renderHook(useHarness)
    act(() => result.current.onCreateSeasonField('points_loss')({ target: { value: '-1' } }))

    let valid
    act(() => {
      valid = result.current.validateCreateSeasonForm(result.current.seasonForm)
    })
    expect(valid).toBe(false)
    expect(result.current.createSeasonErrors.points_loss).toBe(
      'dashboard.admin.errors.seasonPointsInvalid'
    )
  })

  it('rejects end < start on create like the edit form (PL-08)', () => {
    const { result } = renderHook(useHarness)
    act(() => result.current.onCreateSeasonField('end_date')({ target: { value: '2026-08-01' } }))

    let valid
    act(() => {
      valid = result.current.validateCreateSeasonForm(result.current.seasonForm)
    })
    expect(valid).toBe(false)
    expect(result.current.createSeasonErrors.end_date).toBe(
      'dashboard.admin.errors.invalidSeasonRange'
    )
  })

  it('clears a field error as soon as the field is edited', () => {
    const { result } = renderHook(useHarness)
    act(() => result.current.onSelectedSeasonField('points_win')({ target: { value: '' } }))
    act(() => {
      result.current.validateSelectedSeasonForm(result.current.selectedSeasonForm)
    })
    expect(result.current.selectedSeasonDateErrors.points_win).not.toBe('')

    act(() => result.current.onSelectedSeasonField('points_win')({ target: { value: '2' } }))
    expect(result.current.selectedSeasonDateErrors.points_win).toBe('')
    expect(result.current.selectedSeasonForm.points_win).toBe(2)
  })
})
