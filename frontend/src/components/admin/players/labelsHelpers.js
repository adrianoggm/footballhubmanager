// Pure helpers for the labels editor (PL-03): true renames and the
// confirmation shown before removing labels that players still use.
//
// Renames are tracked as `{ originalLabel: currentLabel }`, the shape the API
// expects (`role_renames` / `position_renames`). Chained renames (A -> B -> C)
// collapse into A -> C.

const labelKey = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()

export const splitLabels = (text) => {
  const seen = new Set()
  return String(text || '')
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter((item) => {
      const key = item.toLowerCase()
      if (!item || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export const hasLabelKey = (labels, label) =>
  (labels || []).some((item) => labelKey(item) === labelKey(label))

/** Rename one entry of the raw comma/newline separated draft text. */
export const renameLabelInText = (text, oldLabel, newLabel) =>
  splitLabels(text)
    .map((item) => (labelKey(item) === labelKey(oldLabel) ? newLabel.trim() : item))
    .join(', ')

/** Problem with a rename, or '' when valid: non-empty and not another existing label. */
export const validateRename = (labels, oldLabel, newLabel) => {
  const next = String(newLabel || '').trim()
  if (!next) return 'empty'
  const clash = (labels || []).some(
    (item) => labelKey(item) === labelKey(next) && labelKey(item) !== labelKey(oldLabel)
  )
  return clash ? 'duplicate' : ''
}

export const recordRename = (renames, oldLabel, newLabel) => {
  const next = { ...(renames || {}) }
  const original =
    Object.keys(next).find((source) => labelKey(next[source]) === labelKey(oldLabel)) ?? oldLabel
  if (original === newLabel.trim()) {
    delete next[original]
  } else {
    next[original] = newLabel.trim()
  }
  return next
}

/** Renames still meaningful for the labels being saved (target kept, not a no-op). */
export const effectiveRenames = (renames, labels) =>
  Object.fromEntries(
    Object.entries(renames || {}).filter(
      ([source, target]) => source !== target && hasLabelKey(labels, target)
    )
  )

export const countLabelUsage = (players, field, label) =>
  (players || []).filter((player) => labelKey(player?.[field]) === labelKey(label)).length

/**
 * Labels present before editing that are gone from the draft (and were not
 * renamed) while players still use them, with how many players are affected.
 */
export const findRemovedLabelsInUse = ({ previous, next, renames, players, field }) => {
  const renamedSources = Object.keys(effectiveRenames(renames, next)).map(labelKey)
  return (previous || [])
    .filter((label) => !hasLabelKey(next, label) && !renamedSources.includes(labelKey(label)))
    .map((label) => ({ label, count: countLabelUsage(players, field, label) }))
    .filter((item) => item.count > 0)
}
