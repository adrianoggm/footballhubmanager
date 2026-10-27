import { describe, expect, it } from 'vitest'

import { apiErrorKey, translateApiError } from './apiErrors.js'
import { messages } from './messages.js'

const httpError = (detail, extra = {}) =>
  Object.assign(new Error(detail), { status: 400, payload: { detail }, ...extra })

const esT = (key) => key.split('.').reduce((node, part) => node?.[part], messages.es) ?? key

describe('apiErrorKey (PL-09)', () => {
  it.each([
    ['Season range overlaps an existing season', 'apiErrors.seasonOverlap'],
    ['Invalid season date range', 'apiErrors.seasonDateRange'],
    ['Invalid guest player data', 'apiErrors.guestPlayerData'],
    ['Invalid or expired link token', 'apiErrors.linkToken'],
    ['Season points must be non-negative integers', 'apiErrors.seasonPoints'],
  ])('maps the backend detail %j', (detail, key) => {
    expect(apiErrorKey(httpError(detail))).toBe(key)
  })

  it('prefers a payload code over the detail text', () => {
    const error = httpError('Something else', {
      payload: { detail: 'Something else', code: 'invalid_season_points' },
    })
    expect(apiErrorKey(error)).toBe('apiErrors.seasonPoints')
  })

  it('returns null for unknown errors so callers keep their fallback', () => {
    expect(apiErrorKey(httpError('Boom'))).toBeNull()
    expect(apiErrorKey(null)).toBeNull()
  })
})

describe('translateApiError (PL-09)', () => {
  it('shows Spanish text instead of the raw English backend detail', () => {
    const message = translateApiError(httpError('Season range overlaps an existing season'), esT)
    expect(message).toBe(messages.es.apiErrors.seasonOverlap)
    expect(message).not.toMatch(/overlaps/)
  })

  it('every mapped key exists in both languages', () => {
    Object.keys(messages.en.apiErrors).forEach((key) => {
      expect(messages.es.apiErrors[key]).toBeTruthy()
    })
  })
})
