const pickNationalityName = (item) => {
  if (typeof item === 'string') {
    return item.trim()
  }

  if (item && typeof item === 'object') {
    const candidate = item.name ?? item.nationality ?? item.value ?? item.label
    if (typeof candidate === 'string') {
      return candidate.trim()
    }
  }

  return ''
}

export const normalizeNationalities = (payload) => {
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.data)
        ? payload.data
        : []

  const unique = new Set()
  return source.map(pickNationalityName).filter((name) => {
    if (!name || unique.has(name)) {
      return false
    }
    unique.add(name)
    return true
  })
}

// Same default as the admin guest form (PL-13): Spain when the catalog has it,
// otherwise the first catalog entry.
export const DEFAULT_NATIONALITY = 'Spain'

export const pickDefaultNationality = (items) => {
  const list = items || []
  return list.includes(DEFAULT_NATIONALITY) ? DEFAULT_NATIONALITY : list[0] || ''
}
