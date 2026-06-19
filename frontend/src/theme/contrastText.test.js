import { describe, expect, it } from 'vitest'

import { readableTextColor } from './contrastText.js'

describe('readableTextColor', () => {
  it('returns white text on dark backgrounds', () => {
    expect(readableTextColor('#000000')).toBe('#ffffff')
    expect(readableTextColor('#0d1b2a')).toBe('#ffffff')
    expect(readableTextColor('#ff0000')).toBe('#ffffff') // red is dark by luminance
  })

  it('returns dark text on light backgrounds', () => {
    expect(readableTextColor('#ffffff')).toBe('#1a1a1a')
    expect(readableTextColor('#ffff00')).toBe('#1a1a1a') // yellow would fail white text
  })

  it('expands 3-digit hex and tolerates a missing #', () => {
    expect(readableTextColor('#fff')).toBe('#1a1a1a')
    expect(readableTextColor('ffffff')).toBe('#1a1a1a')
  })

  it('falls back to white text on invalid input', () => {
    expect(readableTextColor('nope')).toBe('#ffffff')
    expect(readableTextColor('')).toBe('#ffffff')
    expect(readableTextColor(undefined)).toBe('#ffffff')
  })
})
