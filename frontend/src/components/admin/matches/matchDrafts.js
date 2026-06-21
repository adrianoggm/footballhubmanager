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
