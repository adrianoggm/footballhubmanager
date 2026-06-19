// Pick a readable text color (black or white) for an arbitrary background.
// Label colors are admin-chosen and can be light or dark, so hardcoding white
// text fails WCAG contrast on light labels (audit UX-9). This mirrors MUI's
// getContrastText heuristic without needing the theme object, so it works in
// plain sx-style helpers.

const DARK_TEXT = '#1a1a1a'
const LIGHT_TEXT = '#ffffff'

const parseHex = (hex) => {
  let value = String(hex).trim().replace('#', '')
  if (value.length === 3) {
    value = value
      .split('')
      .map((c) => c + c)
      .join('')
  }
  if (value.length !== 6 || /[^0-9a-fA-F]/.test(value)) {
    return null
  }
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  }
}

// Relative luminance (WCAG 2.x). Returns 0 (black) .. 1 (white).
const relativeLuminance = ({ r, g, b }) => {
  const channel = (c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export const readableTextColor = (background) => {
  const rgb = parseHex(background)
  if (!rgb) {
    return LIGHT_TEXT
  }
  // Threshold ~0.5 keeps white on mid/dark colors and switches to dark text on
  // light ones (yellow, lime, pastels) where white would be unreadable.
  return relativeLuminance(rgb) > 0.5 ? DARK_TEXT : LIGHT_TEXT
}
