// Pure lineup/guid helpers shared between AdminDashboard (match-create form) and
// the useMatchTracking hook. Extracted so the hook can own match-tracking logic
// without importing from the component that consumes it.

const splitGuids = (value) =>
  value
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter(Boolean)

export const normalizePlayerGuids = (value) => {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => String(item || '').trim()).filter(Boolean)))
  }
  if (typeof value === 'string') {
    return Array.from(new Set(splitGuids(value)))
  }
  return []
}

export const setUnionSize = (left, right) => new Set([...left, ...right]).size

export const formatPlayerDisplayName = (player) => {
  const fullName = [player.name, player.surname1, player.surname2].filter(Boolean).join(' ')
  if (player.nickname && fullName) {
    return `${player.nickname} (${fullName})`
  }
  if (player.nickname) {
    return player.nickname
  }
  return fullName || player.player_guid || player.guid || ''
}

export const buildLineupPlayerOptions = (...groups) => {
  const byGuid = new Map()
  groups
    .flat()
    .filter(Boolean)
    .forEach((player) => {
      const guid = String(player.player_guid || player.guid || '').trim()
      if (!guid || byGuid.has(guid)) {
        return
      }
      byGuid.set(guid, {
        guid,
        label: formatPlayerDisplayName(player) || guid,
      })
    })
  return Array.from(byGuid.values())
}
