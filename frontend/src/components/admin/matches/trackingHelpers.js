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

export const buildTrackedTeamScore = (detail) => {
  if (!detail || detail.status === 'closed' || !(detail.events || []).length) {
    return null
  }

  const totals = { home: 0, away: 0 }
  ;(detail.events || []).forEach((event) => {
    if (String(event?.event_type || '').toLowerCase() !== 'goal') {
      return
    }
    const teamSide = String(event?.team_side || '').toLowerCase()
    if (!['home', 'away'].includes(teamSide)) {
      return
    }
    totals[teamSide] += Number(event?.value_delta || 1)
  })

  return {
    home: clampTrackedValue(totals.home),
    away: clampTrackedValue(totals.away),
  }
}
