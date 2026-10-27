// Backend error -> i18n key mapping (PL-09).
//
// The API answers errors as `{ detail: "<English message>" }` without a stable
// error code, so the known details are matched case-insensitively. If the
// backend ever adds `code` to the payload, map it in API_ERROR_KEYS_BY_CODE:
// codes win over details.

const API_ERROR_KEYS_BY_CODE = {
  invalid_season_points: 'apiErrors.seasonPoints',
  invalid_pena_guest_player_data: 'apiErrors.guestPlayerData',
}

const API_ERROR_KEYS_BY_DETAIL = {
  'season range overlaps an existing season': 'apiErrors.seasonOverlap',
  'invalid season date range': 'apiErrors.seasonDateRange',
  'invalid season data': 'apiErrors.seasonData',
  'invalid season update data': 'apiErrors.seasonData',
  'season points must be non-negative integers': 'apiErrors.seasonPoints',
  'invalid guest player data': 'apiErrors.guestPlayerData',
  'invalid or expired link token': 'apiErrors.linkToken',
}

const normalize = (value) =>
  String(value || '')
    .trim()
    .replace(/\.$/, '')
    .toLowerCase()

export const apiErrorKey = (error) => {
  if (!error) {
    return null
  }
  const code = error?.payload?.code ?? error?.code
  if (code && API_ERROR_KEYS_BY_CODE[code]) {
    return API_ERROR_KEYS_BY_CODE[code]
  }
  const detail = typeof error === 'string' ? error : (error?.payload?.detail ?? error?.message)
  if (typeof detail !== 'string') {
    return null
  }
  return API_ERROR_KEYS_BY_DETAIL[normalize(detail)] || null
}

/** Translated message for a known backend error, or `null` when it is unknown. */
export const translateApiError = (error, t) => {
  const key = apiErrorKey(error)
  return key ? t(key) : null
}
