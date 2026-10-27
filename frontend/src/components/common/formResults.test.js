import { describe, expect, it } from 'vitest'
import { buildFormSequence, formResultFromScore, normalizeFormResult } from './formResults.js'

describe('normalizeFormResult', () => {
  it.each([
    ['win', 'win'],
    ['W', 'win'],
    ['V', 'win'],
    ['draw', 'draw'],
    ['E', 'draw'],
    ['loss', 'loss'],
    ['L', 'loss'],
    ['Derrota', 'loss'],
  ])('%s -> %s', (raw, expected) => {
    expect(normalizeFormResult(raw)).toBe(expected)
  })

  it('rejects the ambiguous "D" and unknown values', () => {
    expect(normalizeFormResult('D')).toBeNull()
    expect(normalizeFormResult('x')).toBeNull()
    expect(normalizeFormResult(null)).toBeNull()
  })
})

describe('formResultFromScore', () => {
  it('maps scores to win / draw / loss', () => {
    expect(formResultFromScore(3, 1)).toBe('win')
    expect(formResultFromScore(2, 2)).toBe('draw')
    expect(formResultFromScore(0, 2)).toBe('loss')
  })

  it('returns null when a score is missing', () => {
    expect(formResultFromScore(null, 1)).toBeNull()
    expect(formResultFromScore(1, undefined)).toBeNull()
  })
})

describe('buildFormSequence', () => {
  it('normalizes, drops unknown entries and keeps the last N', () => {
    expect(buildFormSequence(['W', 'x', 'E', 'loss', 'win', 'V', 'L'], 5)).toEqual([
      'draw',
      'loss',
      'win',
      'win',
      'loss',
    ])
  })
})
