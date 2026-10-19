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
