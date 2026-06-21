// Shared, pure status helpers for match tracking. Promoted out of
// admin/matches/trackingHelpers.js so both the admin and user dashboards render
// identical status chips/labels (admin/user parity — see audit UX-1).

export const isLiveTrackingStatus = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
  return normalized === 'live' || normalized === 'in_progress'
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
