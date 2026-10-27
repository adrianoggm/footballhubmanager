export const SEASON_STATUS = { ALL: 'all', IN_SEASON: 'in_season', OUT_OF_SEASON: 'out_of_season' }

export function isInSeason(player, seasonRosterGuids) {
  return Boolean(seasonRosterGuids && seasonRosterGuids.has(player.guid))
}

export function playerSortKey(player) {
  return [player.name, player.surname1, player.surname2]
    .filter(Boolean)
    .join(' ')
    .trim()
    .toLowerCase()
}

export function matchesSearch(player, query) {
  const q = (query || '').trim().toLowerCase()
  if (!q) return true
  const hay = [player.name, player.surname1, player.surname2, player.nickname]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}

export function filterPlayers(players, { search, roles, positions, status }, seasonRosterGuids) {
  const roleSet = new Set((roles || []).map((r) => String(r).toLowerCase()))
  const posSet = new Set((positions || []).map((p) => String(p).toLowerCase()))
  return (players || []).filter((p) => {
    if (!matchesSearch(p, search)) return false
    if (roleSet.size && !roleSet.has(String(p.role || '').toLowerCase())) return false
    if (posSet.size && !posSet.has(String(p.position || '').toLowerCase())) return false
    if (status === SEASON_STATUS.IN_SEASON && !isInSeason(p, seasonRosterGuids)) return false
    if (status === SEASON_STATUS.OUT_OF_SEASON && isInSeason(p, seasonRosterGuids)) return false
    return true
  })
}

export function sortPlayers(players, sort, seasonRosterGuids) {
  const byName = (a, b) => playerSortKey(a).localeCompare(playerSortKey(b))
  const copy = [...(players || [])]
  if (sort === 'name_desc') return copy.sort((a, b) => byName(b, a))
  if (sort === 'status_active' || sort === 'status_inactive') {
    const dir = sort === 'status_active' ? 1 : -1
    return copy.sort((a, b) => {
      const d =
        (isInSeason(a, seasonRosterGuids) ? 0 : 1) - (isInSeason(b, seasonRosterGuids) ? 0 : 1)
      return d !== 0 ? d * dir : byName(a, b)
    })
  }
  return copy.sort(byName)
}

const labelKey = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()

/**
 * Deterministic default role of a membership (PL-04), mirroring the backend
 * `default_role_label`: a membership always has a role, so there is no
 * "no role" option. Players without an account prefer `guest` then `member`;
 * with an account `member` then `guest`; otherwise the LAST (least privileged)
 * label — never the first one (`president`).
 */
export function defaultRoleLabel(options, { hasAccount = false } = {}) {
  const list = options || []
  if (!list.length) return ''
  const preferred = hasAccount ? ['member', 'guest'] : ['guest', 'member']
  for (const key of preferred) {
    const match = list.find((option) => labelKey(option) === key)
    if (match) return match
  }
  return list[list.length - 1]
}

const identityKey = (player) =>
  [player.name, player.surname1, player.nickname].map(labelKey).join('|')

/**
 * Existing players that the new player would duplicate (PL-06): same name and
 * first surname, and the same nickname when both have one.
 */
export function findDuplicatePlayers(players, form) {
  const name = labelKey(form?.name)
  const surname1 = labelKey(form?.surname1)
  if (!name || !surname1) return []
  const nickname = labelKey(form?.nickname)
  return (players || []).filter((player) => {
    if (labelKey(player.name) !== name || labelKey(player.surname1) !== surname1) return false
    const existingNickname = labelKey(player.nickname)
    return !nickname || !existingNickname || existingNickname === nickname
  })
}

const shortCode = (player) =>
  String(player.guid || player.player_guid || '')
    .replace(/-/g, '')
    .slice(0, 6)
    .toUpperCase()

/**
 * Returns a labeler that appends a distinguishing detail when several players
 * share the same display name (PL-06): second surname / nationality and a short
 * code derived from the GUID, which is always unique.
 */
export function buildPlayerLabeler(players, formatName) {
  const counts = new Map()
  ;(players || []).forEach((player) => {
    const key = labelKey(formatName(player))
    counts.set(key, (counts.get(key) || 0) + 1)
  })
  return (player) => {
    const base = formatName(player)
    if ((counts.get(labelKey(base)) || 0) < 2) return base
    const details = [
      player.surname2,
      player.nationality,
      shortCode(player) && `#${shortCode(player)}`,
    ]
      .filter(Boolean)
      .join(' · ')
    return details ? `${base} (${details})` : base
  }
}

export function paginate(items, page, pageSize) {
  const list = items || []
  const total = list.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page || 1), pageCount)
  const start = (safePage - 1) * pageSize
  const pageItems = list.slice(start, start + pageSize)
  return { pageItems, total, pageCount, shown: pageItems.length }
}
