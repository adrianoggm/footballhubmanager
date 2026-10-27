// Pure helpers for match tracking status/score, shared by the matches section
// and its extracted cards. The status mapping (live/paused/chip color/label)
// now lives in components/common/trackingStatus.js so the user dashboard can
// reuse it; re-exported here for back-compat with existing admin imports.

export {
  isLiveTrackingStatus,
  isPausedTrackingStatus,
  trackingChipColor,
  trackingLabel,
} from '../../common/trackingStatus.js'

import { isLiveTrackingStatus, isPausedTrackingStatus } from '../../common/trackingStatus.js'

export const clampTrackedValue = (value) => Math.max(0, Number(value || 0))

export const resolveDisplayedElapsed = (matchDetail, nowEpoch) => {
  if (!matchDetail) {
    return 0
  }
  const storedElapsed = Number(matchDetail.elapsed_seconds || 0)
  const isTiming =
    isLiveTrackingStatus(matchDetail.tracking_status) ||
    isPausedTrackingStatus(matchDetail.tracking_status)
  // Only the live/paused clock is computed from epochs; not-started and
  // finished matches use the stored elapsed so the timer doesn't keep ticking.
  if (!isTiming || !matchDetail.started_at_epoch) {
    return storedElapsed
  }
  // Mirror the backend clock: exclude both completed pauses and any in-progress
  // pause segment. paused_at_epoch is set while paused, so time since then does
  // not count.
  const effectivePaused =
    Number(matchDetail.total_paused_seconds || 0) +
    (matchDetail.paused_at_epoch ? Math.max(nowEpoch - Number(matchDetail.paused_at_epoch), 0) : 0)
  const liveElapsed = nowEpoch - Number(matchDetail.started_at_epoch) - effectivePaused
  return Math.max(storedElapsed, liveElapsed)
}

// The API only accepts value_delta of +1/-1 and defaults it to 1, so only a
// missing value falls back to 1; an explicit 0 stays 0.
export const resolveEventDelta = (event) => Number(event?.value_delta ?? 1) || 0

// Team score = sum of each scorer's clamped goal count, exactly like the
// summary tab (MatchDetailViewer) and the backend close-out, so a stray "-1"
// on a player without goals can never cancel another player's goal.
export const buildTrackedTeamScore = (detail) => {
  if (!detail || detail.status === 'closed' || !(detail.events || []).length) {
    return null
  }

  const goalsByScorer = { home: new Map(), away: new Map() }
  ;(detail.events || []).forEach((event) => {
    if (String(event?.event_type || '').toLowerCase() !== 'goal') {
      return
    }
    const teamSide = String(event?.team_side || '').toLowerCase()
    if (!['home', 'away'].includes(teamSide)) {
      return
    }
    const scorer = String(event?.player_guid || '')
    const scorers = goalsByScorer[teamSide]
    scorers.set(scorer, (scorers.get(scorer) || 0) + resolveEventDelta(event))
  })

  const sumClamped = (scorers) =>
    [...scorers.values()].reduce((total, goals) => total + clampTrackedValue(goals), 0)
  return {
    home: sumClamped(goalsByScorer.home),
    away: sumClamped(goalsByScorer.away),
  }
}
