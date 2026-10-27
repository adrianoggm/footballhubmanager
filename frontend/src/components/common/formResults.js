// Recent-form helpers for FormDots (V/E/D in Spanish, W/D/L in English).
// Canonical result ids are 'win' | 'draw' | 'loss'; colors live in
// `theme.custom.form[result]` and letters/names in `ui.form.*` (i18n).

export const FORM_RESULTS = Object.freeze(['win', 'draw', 'loss'])

// Unambiguous aliases only: "D" means draw in English but defeat in Spanish,
// so a bare "D" is rejected instead of guessed.
const ALIASES = Object.freeze({
  win: 'win',
  won: 'win',
  w: 'win',
  v: 'win',
  victoria: 'win',
  draw: 'draw',
  drawn: 'draw',
  tie: 'draw',
  e: 'draw',
  empate: 'draw',
  loss: 'loss',
  lost: 'loss',
  l: 'loss',
  derrota: 'loss',
})

/** Canonical result id ('win' | 'draw' | 'loss') or null when unknown. */
export function normalizeFormResult(raw) {
  const key = String(raw ?? '')
    .trim()
    .toLowerCase()
  return ALIASES[key] || null
}

/** Result of one side given both scores, or null when a score is missing. */
export function formResultFromScore(ownScore, otherScore) {
  if (
    ownScore === null ||
    ownScore === undefined ||
    otherScore === null ||
    otherScore === undefined
  ) {
    return null
  }
  const own = Number(ownScore)
  const other = Number(otherScore)
  if (!Number.isFinite(own) || !Number.isFinite(other)) {
    return null
  }
  if (own > other) {
    return 'win'
  }
  return own === other ? 'draw' : 'loss'
}

/** Normalizes a list, drops unknown entries and keeps the last `max` (oldest first). */
export function buildFormSequence(results = [], max = 5) {
  const normalized = (Array.isArray(results) ? results : [])
    .map((item) => (FORM_RESULTS.includes(item) ? item : normalizeFormResult(item)))
    .filter(Boolean)
  return max > 0 ? normalized.slice(-max) : normalized
}
