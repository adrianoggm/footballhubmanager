// Pure match draft/form helpers. No React, no services; just shape mapping and
// validation, so they are cheap to unit-test and reuse from match orchestration.

export const defaultMatchEventDraft = () => ({
  event_type: 'goal',
  team_side: 'home',
  player_guid: '',
  related_player_guid: '',
  note: '',
  minute: '',
  second: '',
  value_delta: '1',
})

export const buildTeamStatsDraft = (team) => ({
  players: (team?.players || []).map((player) => ({
    player_guid: player.player_guid,
    goals: String(player.goals ?? 0),
    assists: String(player.assists ?? 0),
    saves: String(player.saves ?? 0),
    rating: String(player.rating ?? 0),
  })),
})

export const buildMatchStatsDraft = (detail) => ({
  home_team: buildTeamStatsDraft(detail?.home_team),
  away_team: buildTeamStatsDraft(detail?.away_team),
})

export const buildMatchLineupsDraft = (detail) => ({
  home_player_guids: (detail?.home_team?.players || []).map((player) => player.player_guid),
  away_player_guids: (detail?.away_team?.players || []).map((player) => player.player_guid),
})

/**
 * Validate the minute/second of a manual match event.
 * Returns { isValid, hasValue, value } where `value` is total elapsed seconds
 * (or null when no time was entered / the input is invalid).
 */
export const parseMatchEventElapsedDraft = (draft) => {
  const minuteValue = String(draft?.minute ?? '').trim()
  const secondValue = String(draft?.second ?? '').trim()
  if (!minuteValue && !secondValue) {
    return { isValid: true, hasValue: false, value: null }
  }

  const minutes = Number(minuteValue || 0)
  const seconds = Number(secondValue || 0)
  if (
    !Number.isInteger(minutes) ||
    minutes < 0 ||
    !Number.isInteger(seconds) ||
    seconds < 0 ||
    seconds > 59
  ) {
    return { isValid: false, hasValue: true, value: null }
  }

  return {
    isValid: true,
    hasValue: true,
    value: minutes * 60 + seconds,
  }
}

/**
 * Validate the create-match date before calling the API (MT-02): it is
 * required and must fall inside the selected season (ISO strings compare
 * lexicographically). Returns an i18n error key, or null when valid.
 */
export const validateMatchDate = (matchDate, season) => {
  const iso = String(matchDate ?? '').trim()
  if (!iso) {
    return 'dashboard.admin.errors.matchDateRequired'
  }
  if (
    (season?.start_date && iso < season.start_date) ||
    (season?.end_date && iso > season.end_date)
  ) {
    return 'dashboard.admin.errors.matchDateOutsideSeason'
  }
  return null
}

// After a successful creation clear teams and lineups so a second click cannot
// create a duplicate (MT-11); keep the date, the next match is often the same day.
export const resetMatchFormAfterCreate = (form) => ({
  ...form,
  home_team_name: '',
  away_team_name: '',
  home_player_guids: [],
  away_player_guids: [],
})

// Player match ratings use a 0-10 scale (insights radar scaleMax, API le=10).
export const MATCH_RATING_MAX = 10

/**
 * Parse one stats-draft row into the API payload, or null when invalid:
 * goals/assists/saves are integers >= 0 and rating is within 0..10 (MT-09).
 */
export const parseStatsPayload = (values) => {
  const goals = Number(values.goals)
  const assists = Number(values.assists)
  const saves = Number(values.saves)
  const rating = Number(values.rating)
  const invalidIntegers = [goals, assists, saves].some(
    (item) => !Number.isInteger(item) || item < 0
  )
  if (invalidIntegers || Number.isNaN(rating) || rating < 0 || rating > MATCH_RATING_MAX) {
    return null
  }
  return {
    player_guid: values.player_guid,
    goals,
    assists,
    saves,
    rating,
  }
}
