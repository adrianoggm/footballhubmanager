import { describe, expect, it } from 'vitest'
import { formatRating, ratingBucket } from './ratingScale.js'

describe('ratingBucket', () => {
  it.each([
    [9.4, 'excellent'],
    [8, 'excellent'],
    [7.99, 'good'],
    [7, 'good'],
    [6.9, 'fair'],
    [6, 'fair'],
    [5.99, 'poor'],
    [0, 'poor'],
    ['7,6', 'good'],
    ['8.1', 'excellent'],
  ])('%s -> %s', (value, bucket) => {
    expect(ratingBucket(value)).toBe(bucket)
  })

  it.each([null, undefined, '', 'n/a', Number.NaN])('returns null for %s', (value) => {
    expect(ratingBucket(value)).toBeNull()
  })
})

describe('formatRating', () => {
  it('uses a decimal comma in Spanish and a point in English', () => {
    expect(formatRating(7.6, 'es')).toBe('7,6')
    expect(formatRating(7.6, 'en')).toBe('7.6')
    expect(formatRating(8, 'es')).toBe('8,0')
  })

  it('renders a dash without a rating', () => {
    expect(formatRating(null)).toBe('–')
  })
})
