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

export function sortPlayers(players, sort) {
  const copy = [...(players || [])]
  copy.sort((a, b) => playerSortKey(a).localeCompare(playerSortKey(b)))
  if (sort === 'name_desc') copy.reverse()
  return copy
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
