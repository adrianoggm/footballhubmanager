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

import { isLiveTrackingStatus } from '../../common/trackingStatus.js'

export const clampTrackedValue = (value) => Math.max(0, Number(value || 0))

export const resolveDisplayedElapsed = (matchDetail, nowEpoch) => {
  if (!matchDetail) {
    return 0
  }
  if (!isLiveTrackingStatus(matchDetail.tracking_status) || !matchDetail.started_at_epoch) {
    return Number(matchDetail.elapsed_seconds || 0)
  }
  // Mirror the backend clock: paused intervals are excluded so the live timer
  // resumes where it stopped instead of counting the time spent paused.
  const liveElapsed =
    nowEpoch - matchDetail.started_at_epoch - Number(matchDetail.total_paused_seconds || 0)
  return Math.max(Number(matchDetail.elapsed_seconds || 0), liveElapsed)
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
