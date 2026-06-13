// Pure helpers for match tracking status/score, shared by the matches section
// and its extracted cards.

export const isLiveTrackingStatus = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
  return normalized === 'live' || normalized === 'in_progress'
}

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

export const isPausedTrackingStatus = (value) =>
  String(value || '')
    .trim()
    .toLowerCase() === 'paused'

export const trackingChipColor = (status) => {
  switch (String(status || '').toLowerCase()) {
    case 'live':
    case 'in_progress':
      return 'success'
    case 'paused':
      return 'warning'
    case 'finished':
      return 'info'
    default:
      return 'default'
  }
}

export const trackingLabel = (status, t) => {
  switch (String(status || '').toLowerCase()) {
    case 'live':
    case 'in_progress':
      return t('dashboard.common.matchDetail.trackingLive')
    case 'paused':
      return t('dashboard.common.matchDetail.trackingPaused')
    case 'finished':
      return t('dashboard.common.matchDetail.trackingFinished')
    default:
      return t('dashboard.common.matchDetail.trackingNotStarted')
  }
}
