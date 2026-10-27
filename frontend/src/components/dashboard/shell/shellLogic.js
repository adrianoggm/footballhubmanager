// Pure helpers behind the dashboard shell: keyboard sequences (G + letter),
// command palette search, season labels and crest initials.

export const SEQUENCE_TIMEOUT_MS = 1200

/** Lower-case, accent-free text for matching ("Clasificación" -> "clasificacion"). */
export const normalizeSearch = (value = '') =>
  String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

/** Parses a hint like "G R" into ['g', 'r']. */
export const parseShortcut = (shortcut = '') =>
  String(shortcut || '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)

/**
 * Two-key sequence matcher. `bindings` is [{ keys: ['g', 'r'], run }].
 * `feed(key, now)` returns the completed binding or null.
 */
export function createSequenceMatcher(bindings = [], timeoutMs = SEQUENCE_TIMEOUT_MS) {
  let pending = []
  let lastAt = 0

  const startsWith = (prefix) =>
    bindings.some(
      (binding) =>
        binding.keys.length > prefix.length && prefix.every((key, i) => binding.keys[i] === key)
    )

  return {
    feed(rawKey, now = Date.now()) {
      const key = String(rawKey || '').toLowerCase()
      if (pending.length && now - lastAt > timeoutMs) {
        pending = []
      }
      lastAt = now
      const candidate = [...pending, key]
      const match = bindings.find(
        (binding) =>
          binding.keys.length === candidate.length &&
          binding.keys.every((part, i) => part === candidate[i])
      )
      if (match) {
        pending = []
        return match
      }
      if (startsWith(candidate)) {
        pending = candidate
        return null
      }
      // A fresh prefix restarts the sequence (e.g. "g g r").
      pending = startsWith([key]) ? [key] : []
      return null
    },
    reset() {
      pending = []
    },
  }
}

/** True when keystrokes belong to a form field and must not trigger shortcuts. */
export function isTypingTarget(target) {
  if (!target || typeof target !== 'object') {
    return false
  }
  const tag = String(target.tagName || '').toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    return true
  }
  return Boolean(target.isContentEditable)
}

export const COMMAND_GROUP_ORDER = Object.freeze([
  'actions',
  'sections',
  'matches',
  'players',
  'penas',
])

const scoreItem = (item, tokens, query) => {
  const label = normalizeSearch(item.label)
  const haystack = `${label} ${normalizeSearch(item.keywords || '')} ${normalizeSearch(
    item.sublabel || ''
  )}`
  if (!tokens.every((token) => haystack.includes(token))) {
    return 0
  }
  if (label.startsWith(query)) {
    return 3
  }
  if (label.split(/\s+/).some((word) => word.startsWith(tokens[0]))) {
    return 2
  }
  return 1
}

/**
 * Filters and orders palette items by group (actions, sections, matches,
 * players, penas) and relevance. With an empty query only items not flagged
 * `searchOnly` are listed. `limitPerGroup` caps every group.
 */
export function filterCommandItems(items = [], query = '', { limitPerGroup = 6 } = {}) {
  const normalizedQuery = normalizeSearch(query)
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean)
  const scored = items
    .map((item, index) => ({
      item,
      index,
      score: tokens.length ? scoreItem(item, tokens, normalizedQuery) : item.searchOnly ? 0 : 1,
    }))
    .filter((entry) => entry.score > 0)

  const groupRank = (group) => {
    const rank = COMMAND_GROUP_ORDER.indexOf(group)
    return rank < 0 ? COMMAND_GROUP_ORDER.length : rank
  }

  scored.sort(
    (left, right) =>
      groupRank(left.item.group) - groupRank(right.item.group) ||
      right.score - left.score ||
      left.index - right.index
  )

  const perGroup = {}
  return scored
    .filter(({ item }) => {
      perGroup[item.group] = (perGroup[item.group] || 0) + 1
      return perGroup[item.group] <= limitPerGroup
    })
    .map(({ item }) => item)
}

const yearOf = (isoDate) => {
  const match = /^(\d{4})/.exec(String(isoDate || ''))
  return match ? match[1] : ''
}

/** "2026/27" (or "2026" when the season fits in one calendar year). */
export function formatSeasonLong(season) {
  const start = yearOf(season?.start_date)
  const end = yearOf(season?.end_date)
  if (!start) {
    return ''
  }
  return !end || end === start ? start : `${start}/${end.slice(-2)}`
}

/** "26/27" (or "26"), for the compact mobile chip. */
export function formatSeasonShort(season) {
  const start = yearOf(season?.start_date)
  const end = yearOf(season?.end_date)
  if (!start) {
    return ''
  }
  return !end || end === start ? start.slice(-2) : `${start.slice(-2)}/${end.slice(-2)}`
}

/** "1 sep 2026 – 30 jun 2027" in the active language. */
export function formatSeasonRange(season, language = 'es') {
  const format = (iso) => {
    if (!iso) {
      return ''
    }
    const date = new Date(`${iso}T00:00:00`)
    if (Number.isNaN(date.getTime())) {
      return ''
    }
    return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
      .format(date)
      .replace('.', '')
  }
  const start = format(season?.start_date)
  const end = format(season?.end_date)
  return start && end ? `${start} – ${end}` : start || end
}

/**
 * Up to two upper-case initials for a crest. A leading generic word ("Peña",
 * "Club") is skipped: "Peña El Rondo" -> "ER", "Los Veteranos" -> "LV".
 */
export function initialsOf(value = '', fallback = 'FH') {
  const generic = new Set(['pena', 'club'])
  const words = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const meaningful = words.filter((word, index) => index > 0 || !generic.has(normalizeSearch(word)))
  const source = meaningful.length ? meaningful : words
  const initials = source
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || '')
    .join('')
  return initials || fallback
}

/** Keyboard label of the platform's command modifier. */
export const commandModifierLabel = () =>
  typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform || '')
    ? '⌘'
    : 'Ctrl'
