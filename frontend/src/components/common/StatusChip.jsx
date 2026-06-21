import { Box, Chip, Stack } from '@mui/material'

import {
  isLiveTrackingStatus,
  isPausedTrackingStatus,
  trackingChipColor,
  trackingLabel,
} from './trackingStatus.js'

/**
 * Shared match status chip — gives the admin and user dashboards identical
 * status signalling (audit UX-1).
 *
 * Renders the open/closed status chip and, when the match is being tracked
 * (live/paused), an extra colored tracking chip. A live match gets a pulsing
 * dot; the pulse is disabled under `prefers-reduced-motion`.
 *
 * Props:
 *  - status: 'open' | 'closed' (or backend equivalent)
 *  - trackingStatus?: 'live' | 'in_progress' | 'paused' | 'finished' | ...
 *  - t: i18n translate fn
 *  - size?: 'small' | 'medium' (default 'small')
 */
export default function StatusChip({ status, trackingStatus, t, size = 'small' }) {
  const isClosed = String(status || '').toLowerCase() === 'closed'
  const isLive = isLiveTrackingStatus(trackingStatus)
  const showTracking = isLive || isPausedTrackingStatus(trackingStatus)

  const liveDot = isLive ? (
    <Box
      component="span"
      aria-hidden
      sx={{
        width: 8,
        height: 8,
        mr: 0.5,
        borderRadius: '50%',
        bgcolor: 'currentColor',
        animation: 'statusChipPulse 1.2s ease-in-out infinite',
        '@keyframes statusChipPulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.25 },
        },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    />
  ) : null

  return (
    <Stack spacing={0.75} alignItems="flex-start">
      <Chip
        size={size}
        color={isClosed ? 'success' : 'warning'}
        label={isClosed ? t('dashboard.user.statusClosed') : t('dashboard.user.statusOpen')}
      />
      {showTracking ? (
        <Chip
          size={size}
          color={trackingChipColor(trackingStatus)}
          icon={liveDot || undefined}
          label={trackingLabel(trackingStatus, t)}
        />
      ) : null}
    </Stack>
  )
}
