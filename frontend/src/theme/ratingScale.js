// Player rating scale (Sofascore-style), shared by tables, pitch, cards and lists.
// The bucket is pure logic; its colors live in `theme.custom.rating[bucket]`
// ({ bg, fg }) so every preset keeps a readable badge in light and dark mode.

export const RATING_BUCKETS = Object.freeze(['excellent', 'good', 'fair', 'poor'])

// Inclusive lower bounds: >= 8 excellent, 7–7.9 good, 6–6.9 fair, < 6 poor.
export const RATING_THRESHOLDS = Object.freeze({ excellent: 8, good: 7, fair: 6 })

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const numeric = typeof value === 'number' ? value : Number(String(value).replace(',', '.'))
  return Number.isFinite(numeric) ? numeric : null
}

/** Bucket id for a rating, or null when there is no rating to show. */
export function ratingBucket(value) {
  const numeric = toNumber(value)
  if (numeric === null) {
    return null
  }
  if (numeric >= RATING_THRESHOLDS.excellent) {
    return 'excellent'
  }
  if (numeric >= RATING_THRESHOLDS.good) {
    return 'good'
  }
  if (numeric >= RATING_THRESHOLDS.fair) {
    return 'fair'
  }
  return 'poor'
}

/** One-decimal rating in the active locale ("7,6" in es, "7.6" in en). */
export function formatRating(value, language = 'es') {
  const numeric = toNumber(value)
  if (numeric === null) {
    return '–'
  }
  return new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'es-ES', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(numeric)
}
