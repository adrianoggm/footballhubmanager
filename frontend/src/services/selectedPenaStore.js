// Remembers the pena a dashboard user last selected so a reload keeps it (U-01).
// The stored value is only a preference: it is always validated against the
// penas the account can currently see before being used.

const storageKey = (role, userGuid) => `fhm:selected-pena:${role}:${userGuid || 'anonymous'}`

export const readStoredPenaGuid = (role, userGuid) => {
  try {
    return window.localStorage.getItem(storageKey(role, userGuid)) || ''
  } catch {
    return ''
  }
}

export const storeSelectedPenaGuid = (role, userGuid, penaGuid) => {
  try {
    if (penaGuid) {
      window.localStorage.setItem(storageKey(role, userGuid), penaGuid)
    }
  } catch {
    // Storage unavailable (private mode, quota): selection simply is not remembered.
  }
}

/** First candidate guid that matches a visible pena, else the first pena. */
export const resolvePreferredPenaGuid = (penas, candidates = []) => {
  const visible = new Set((penas || []).map((pena) => pena.guid))
  return candidates.find((guid) => guid && visible.has(guid)) || penas?.[0]?.guid || ''
}
