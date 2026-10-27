import { getContrastRatio } from '@mui/material/styles'
import { describe, expect, it } from 'vitest'
import { createAppTheme, DARK_THEME_PRESET_IDS, LIGHT_THEME_PRESET_IDS } from './theme.js'

describe('theme presets (#84)', () => {
  it.each(DARK_THEME_PRESET_IDS)('%s primary.main is readable on dark surfaces', (presetId) => {
    const { palette } = createAppTheme(presetId)
    expect(getContrastRatio(palette.primary.main, palette.background.paper)).toBeGreaterThan(4.5)
  })

  it.each(DARK_THEME_PRESET_IDS)(
    '%s correlation matrix uses dark cells + light text',
    (presetId) => {
      const theme = createAppTheme(presetId)
      const matrix = theme.custom.insightMatrix
      expect(matrix.text).toBe(theme.palette.text.primary)
      expect(matrix.lightness.start).toBeLessThan(50)
      expect(matrix.lightness.start + matrix.lightness.delta).toBeLessThan(50)
    }
  )

  it.each(LIGHT_THEME_PRESET_IDS)(
    '%s correlation matrix keeps pale cells + dark text',
    (presetId) => {
      const matrix = createAppTheme(presetId).custom.insightMatrix
      expect(matrix.lightness.start).toBeGreaterThan(50)
      expect(matrix.lightness.start + matrix.lightness.delta).toBeGreaterThan(50)
      expect(getContrastRatio(matrix.text, '#ffffff')).toBeGreaterThan(4.5)
    }
  )
})

const SURFACE_KEYS = ['card', 'cardAlt', 'raised', 'inset', 'chipHome', 'chipAway', 'tooltip']
const TONE_KEYS = [
  'heading',
  'muted',
  'subtle',
  'accent',
  'accentStrong',
  'accentHover',
  'accentSoftBg',
  'onRaised',
]
const ALL_PRESET_IDS = [...LIGHT_THEME_PRESET_IDS, ...DARK_THEME_PRESET_IDS]
// Ember is the pixel-identical reference of the admin redesign; its original
// muted tone (#88736A) is below AA on its cards, kept on purpose (see #70).
const AA_PRESET_IDS = ALL_PRESET_IDS.filter((id) => id !== 'ember-dark')

describe('semantic surface + tone tokens (#70)', () => {
  it.each(ALL_PRESET_IDS)('%s defines every surface and tone', (presetId) => {
    const { surfaces, tones } = createAppTheme(presetId).custom
    expect(Object.keys(surfaces).sort()).toEqual([...SURFACE_KEYS].sort())
    expect(Object.keys(tones).sort()).toEqual([...TONE_KEYS].sort())
    Object.values({ ...surfaces, ...tones }).forEach((value) => expect(value).toBeTruthy())
  })

  it.each(ALL_PRESET_IDS)('%s main text is AA on card and raised surfaces', (presetId) => {
    const { palette, custom } = createAppTheme(presetId)
    const { surfaces, tones } = custom
    for (const fg of [tones.onRaised, palette.text.primary]) {
      for (const bg of [surfaces.card, surfaces.raised, surfaces.cardAlt, surfaces.inset]) {
        expect(getContrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it.each(ALL_PRESET_IDS)('%s accent + heading tones are AA on card surfaces', (presetId) => {
    const { surfaces, tones } = createAppTheme(presetId).custom
    for (const fg of [tones.accent, tones.heading, tones.subtle]) {
      expect(getContrastRatio(fg, surfaces.card)).toBeGreaterThanOrEqual(4.5)
      expect(getContrastRatio(fg, surfaces.inset)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it.each(AA_PRESET_IDS)('%s muted tone is AA on card and raised surfaces', (presetId) => {
    const { surfaces, tones } = createAppTheme(presetId).custom
    expect(getContrastRatio(tones.muted, surfaces.card)).toBeGreaterThanOrEqual(4.5)
    expect(getContrastRatio(tones.muted, surfaces.raised)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(ALL_PRESET_IDS)('%s accent buttons keep paper text readable', (presetId) => {
    const { palette, custom } = createAppTheme(presetId)
    expect(getContrastRatio(palette.background.paper, custom.tones.accentStrong)).toBeGreaterThan(
      4.5
    )
  })

  it('ember keeps the original admin redesign values', () => {
    const { surfaces, tones, gradients } = createAppTheme('ember-dark').custom
    expect(surfaces).toEqual({
      card: '#1E1E1E',
      cardAlt: '#41312A',
      raised: '#45342C',
      inset: '#261812',
      chipHome: '#41312A',
      chipAway: '#2A2826',
      tooltip: '#261812',
    })
    expect(tones).toEqual({
      heading: '#C1ACA3',
      muted: '#88736A',
      subtle: '#A8938A',
      accent: '#DF9F80',
      accentStrong: '#FCB491',
      accentHover: '#f2a074',
      accentSoftBg: 'rgba(223, 159, 128, 0.14)',
      onRaised: '#F4EEE8',
    })
    expect(gradients.brand).toBe(
      'linear-gradient(160deg, rgba(21,33,55,1) 0%, rgba(22,84,84,1) 85%)'
    )
  })
})
