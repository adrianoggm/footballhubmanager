import {
  Alert,
  Button,
  Chip,
  Divider,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'

const defaultFormatDate = (value) => {
  if (!value) {
    return '-'
  }
  return new Date(`${value}T00:00:00`).toLocaleDateString()
}

const defaultFormatEpochSeconds = (value) => {
  if (!value) {
    return '-'
  }
  return new Date(value * 1000).toLocaleString()
}

const defaultFormatElapsedDuration = (value) => {
  const totalSeconds = Math.max(0, Number(value || 0))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
      seconds
    ).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const TRACKED_MATCH_EVENT_TYPES = ['goal', 'assist', 'save', 'yellow_card', 'red_card']

const clampTrackedValue = (value) => Math.max(0, Number(value || 0))

const isLiveTrackingStatus = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
  return normalized === 'live' || normalized === 'in_progress'
}

const formatPlayerName = (player) => {
  const fullName = [player?.name, player?.surname1, player?.surname2].filter(Boolean).join(' ')
  if (player?.nickname && fullName) {
    return `${player.nickname} (${fullName})`
  }
  if (player?.nickname) {
    return player.nickname
  }
  return fullName || player?.player_guid || '-'
}

const formatRating = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '0.00'
  }
  return value.toFixed(2)
}

const toAllPlayers = (detail) => [
  ...(detail?.home_team?.players || []).map((player) => ({
    ...player,
    team: detail?.home_team?.team_name,
  })),
  ...(detail?.away_team?.players || []).map((player) => ({
    ...player,
    team: detail?.away_team?.team_name,
  })),
]

const buildHighlights = (detail, t) => {
  const players = toAllPlayers(detail)
  if (!players.length) {
    return []
  }

  const pickTop = (metricKey) =>
    players.reduce((best, current) => {
      const currentValue = Number(current?.[metricKey] ?? 0)
      if (!best || currentValue > best.value) {
        return { player: current, value: currentValue }
      }
      return best
    }, null)

  const goalsTop = pickTop('goals')
  const assistsTop = pickTop('assists')
  const savesTop = pickTop('saves')

  const highlights = []
  if (goalsTop && goalsTop.value > 0) {
    highlights.push(
      t('dashboard.common.matchDetail.highlightGoals', {
        player: formatPlayerName(goalsTop.player),
        value: goalsTop.value,
      })
    )
  }
  if (assistsTop && assistsTop.value > 0) {
    highlights.push(
      t('dashboard.common.matchDetail.highlightAssists', {
        player: formatPlayerName(assistsTop.player),
        value: assistsTop.value,
      })
    )
  }
  if (savesTop && savesTop.value > 0) {
    highlights.push(
      t('dashboard.common.matchDetail.highlightSaves', {
        player: formatPlayerName(savesTop.player),
        value: savesTop.value,
      })
    )
  }
  return highlights
}

const trackingChipColor = (status) => {
  switch (String(status || '').toLowerCase()) {
    case 'live':
    case 'in_progress':
      return 'success'
    case 'finished':
      return 'info'
    default:
      return 'default'
  }
}

const trackingLabel = (status, t) => {
  switch (String(status || '').toLowerCase()) {
    case 'live':
    case 'in_progress':
      return t('dashboard.common.matchDetail.trackingLive')
    case 'finished':
      return t('dashboard.common.matchDetail.trackingFinished')
    default:
      return t('dashboard.common.matchDetail.trackingNotStarted')
  }
}

const eventSeverity = (eventType) => {
  switch (String(eventType || '').toLowerCase()) {
    case 'goal':
      return 'success'
    case 'foul':
    case 'yellow_card':
      return 'warning'
    case 'red_card':
    case 'sanction':
      return 'error'
    default:
      return 'info'
  }
}

const resolveLiveElapsed = (detail, nowEpoch) => {
  if (!isLiveTrackingStatus(detail?.tracking_status) || !detail?.started_at_epoch) {
    return Number(detail?.elapsed_seconds || 0)
  }
  return Math.max(Number(detail?.elapsed_seconds || 0), nowEpoch - detail.started_at_epoch)
}

const buildTrackedPlayerEventCounts = (events) => {
  const byPlayer = new Map()
  ;(events || []).forEach((event) => {
    const playerGuid = String(event?.player_guid || '').trim()
    const eventType = String(event?.event_type || '')
      .trim()
      .toLowerCase()
    if (!playerGuid || !TRACKED_MATCH_EVENT_TYPES.includes(eventType)) {
      return
    }
    const valueDelta = Number(event?.value_delta || 1)
    const current = byPlayer.get(playerGuid) || {
      goal: 0,
      assist: 0,
      save: 0,
      yellow_card: 0,
      red_card: 0,
    }
    current[eventType] += valueDelta
    byPlayer.set(playerGuid, current)
  })
  return byPlayer
}

const buildTrackedDisplayDetail = (detail) => {
  if (!detail || detail.status === 'closed' || !(detail.events || []).length) {
    return detail
  }

  const eventCountsByPlayer = buildTrackedPlayerEventCounts(detail.events)
  const mapTrackedTeam = (team) => {
    const players = (team?.players || []).map((player) => {
      const counts = eventCountsByPlayer.get(player.player_guid) || {}
      return {
        ...player,
        goals: clampTrackedValue(counts.goal),
        assists: clampTrackedValue(counts.assist),
        saves: clampTrackedValue(counts.save),
      }
    })
    return {
      ...team,
      score: players.reduce((total, player) => total + clampTrackedValue(player.goals), 0),
      total_assists: players.reduce(
        (total, player) => total + clampTrackedValue(player.assists),
        0
      ),
      total_saves: players.reduce((total, player) => total + clampTrackedValue(player.saves), 0),
      players,
    }
  }

  return {
    ...detail,
    home_team: mapTrackedTeam(detail.home_team),
    away_team: mapTrackedTeam(detail.away_team),
  }
}

const formatEventPlayer = (event, prefix) => {
  const player = {
    player_guid: event?.[`${prefix}_guid`] || '',
    name: event?.[`${prefix}_name`] || '',
    surname1: event?.[`${prefix}_surname1`] || '',
    surname2: event?.[`${prefix}_surname2`] || '',
    nickname: event?.[`${prefix}_nickname`] || '',
  }
  const label = formatPlayerName(player)
  return label === '-' ? '' : label
}

function TeamBreakdown({ team, t }) {
  const players = team?.players || []
  return (
    <Stack spacing={1.5}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={1}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {team?.team_name || '-'}
        </Typography>
        <Chip
          size="small"
          color="secondary"
          label={t('dashboard.common.matchDetail.teamScore', { score: team?.score ?? 0 })}
        />
      </Stack>

      <Stack direction="row" flexWrap="wrap" gap={1}>
        <Chip
          size="small"
          variant="outlined"
          label={t('dashboard.common.matchDetail.lineupCount', { count: players.length })}
        />
        <Chip
          size="small"
          variant="outlined"
          label={t('dashboard.common.matchDetail.totalAssists', {
            value: team?.total_assists ?? 0,
          })}
        />
        <Chip
          size="small"
          variant="outlined"
          label={t('dashboard.common.matchDetail.totalSaves', { value: team?.total_saves ?? 0 })}
        />
        <Chip
          size="small"
          variant="outlined"
          label={t('dashboard.common.matchDetail.averageRating', {
            value: formatRating(team?.average_rating),
          })}
        />
      </Stack>

      {!players.length && (
        <Typography variant="body2" color="text.secondary">
          {t('dashboard.common.matchDetail.noPlayers')}
        </Typography>
      )}

      {players.length > 0 && (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('dashboard.common.matchDetail.player')}</TableCell>
                <TableCell>{t('dashboard.common.matchDetail.position')}</TableCell>
                <TableCell align="right">{t('dashboard.common.matchDetail.goals')}</TableCell>
                <TableCell align="right">{t('dashboard.common.matchDetail.assists')}</TableCell>
                <TableCell align="right">{t('dashboard.common.matchDetail.saves')}</TableCell>
                <TableCell align="right">{t('dashboard.common.matchDetail.rating')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {players.map((player) => (
                <TableRow key={player.player_guid}>
                  <TableCell>{formatPlayerName(player)}</TableCell>
                  <TableCell>{player.position || '-'}</TableCell>
                  <TableCell align="right">{player.goals ?? 0}</TableCell>
                  <TableCell align="right">{player.assists ?? 0}</TableCell>
                  <TableCell align="right">{player.saves ?? 0}</TableCell>
                  <TableCell align="right">{formatRating(player.rating)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  )
}

export default function MatchDetailViewer({
  detail,
  t,
  formatDate = defaultFormatDate,
  formatEpochSeconds = defaultFormatEpochSeconds,
  formatElapsedDuration = defaultFormatElapsedDuration,
  showSubtitle = true,
  onDeleteEvent = null,
  deletingEventGuid = '',
}) {
  const [nowEpoch, setNowEpoch] = useState(() => Math.floor(Date.now() / 1000))

  useEffect(() => {
    if (!isLiveTrackingStatus(detail?.tracking_status)) {
      return undefined
    }
    setNowEpoch(Math.floor(Date.now() / 1000))
    const timerId = window.setInterval(() => {
      setNowEpoch(Math.floor(Date.now() / 1000))
    }, 1000)
    return () => window.clearInterval(timerId)
  }, [detail?.tracking_status, detail?.started_at_epoch])

  if (!detail) {
    return null
  }

  const displayedDetail = buildTrackedDisplayDetail(detail)
  const isClosed = String(displayedDetail.status || '').toLowerCase() === 'closed'
  const highlights = buildHighlights(displayedDetail, t)
  const displayedElapsed = resolveLiveElapsed(displayedDetail, nowEpoch)

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t('dashboard.common.matchDetail.title')}
        </Typography>
        {showSubtitle && (
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.common.matchDetail.subtitle')}
          </Typography>
        )}
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
        <Chip
          size="small"
          variant="outlined"
          label={t('dashboard.common.matchDetail.matchDate', {
            date: formatDate(detail.match_date),
          })}
        />
        <Chip
          size="small"
          color={isClosed ? 'success' : 'warning'}
          label={
            isClosed
              ? t('dashboard.admin.matches.statusClosed')
              : t('dashboard.admin.matches.statusOpen')
          }
        />
        <Chip
          size="small"
          color="primary"
          label={t('dashboard.common.matchDetail.finalScore', {
            score: `${displayedDetail.home_team?.score ?? 0} - ${displayedDetail.away_team?.score ?? 0}`,
          })}
        />
        <Chip
          size="small"
          color={trackingChipColor(displayedDetail.tracking_status)}
          label={trackingLabel(displayedDetail.tracking_status, t)}
        />
        <Chip
          size="small"
          variant="outlined"
          label={t('dashboard.common.matchDetail.elapsed', {
            value: formatElapsedDuration(displayedElapsed),
          })}
        />
        {displayedDetail.started_at_epoch ? (
          <Chip
            size="small"
            variant="outlined"
            label={t('dashboard.common.matchDetail.startedAt', {
              value: formatEpochSeconds(displayedDetail.started_at_epoch),
            })}
          />
        ) : null}
        {displayedDetail.ended_at_epoch ? (
          <Chip
            size="small"
            variant="outlined"
            label={t('dashboard.common.matchDetail.endedAt', {
              value: formatEpochSeconds(displayedDetail.ended_at_epoch),
            })}
          />
        ) : null}
      </Stack>

      <Stack spacing={1}>
        <Typography variant="subtitle2">
          {t('dashboard.common.matchDetail.highlightsTitle')}
        </Typography>
        {highlights.length > 0 ? (
          <Stack spacing={0.75}>
            {highlights.map((highlight) => (
              <Alert key={highlight} severity="info" sx={{ py: 0 }}>
                {highlight}
              </Alert>
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.common.matchDetail.noHighlights')}
          </Typography>
        )}
      </Stack>

      <Stack spacing={1}>
        <Typography variant="subtitle2">{t('dashboard.common.matchDetail.eventsTitle')}</Typography>
        {(displayedDetail.events || []).length > 0 ? (
          <Stack spacing={1}>
            {(displayedDetail.events || []).map((event) => {
              const primaryPlayer = formatEventPlayer(event, 'player')
              const eventDelta = Number(event?.value_delta || 1)
              const relatedPlayer = formatEventPlayer(
                {
                  related_guid: event.related_player_guid,
                  related_name: event.related_player_name,
                  related_surname1: event.related_player_surname1,
                  related_surname2: event.related_player_surname2,
                  related_nickname: event.related_player_nickname,
                },
                'related'
              )
              return (
                <Alert
                  key={event.guid}
                  severity={eventSeverity(event.event_type)}
                  action={
                    onDeleteEvent ? (
                      <Button
                        size="small"
                        color="inherit"
                        onClick={() => onDeleteEvent(event.guid)}
                        disabled={deletingEventGuid === event.guid}
                      >
                        {t('dashboard.admin.matches.deleteEvent')}
                      </Button>
                    ) : null
                  }
                >
                  <Stack spacing={0.5}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={formatElapsedDuration(event.elapsed_seconds)}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={t(`dashboard.admin.matches.eventTypes.${event.event_type}`)}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={t(`dashboard.admin.matches.teamSides.${event.team_side}`)}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={eventDelta >= 0 ? `+${eventDelta}` : `${eventDelta}`}
                      />
                    </Stack>
                    {primaryPlayer ? (
                      <Typography variant="body2">
                        {t('dashboard.common.matchDetail.eventPlayer', { player: primaryPlayer })}
                      </Typography>
                    ) : null}
                    {relatedPlayer ? (
                      <Typography variant="body2" color="text.secondary">
                        {t('dashboard.common.matchDetail.eventRelatedPlayer', {
                          player: relatedPlayer,
                        })}
                      </Typography>
                    ) : null}
                    {event.note ? (
                      <Typography variant="body2" color="text.secondary">
                        {t('dashboard.common.matchDetail.eventNote', { note: event.note })}
                      </Typography>
                    ) : null}
                    <Typography variant="caption" color="text.secondary">
                      {t('dashboard.common.matchDetail.eventRecordedAt', {
                        value: formatEpochSeconds(event.recorded_at_epoch),
                      })}
                    </Typography>
                  </Stack>
                </Alert>
              )
            })}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.common.matchDetail.eventsEmpty')}
          </Typography>
        )}
      </Stack>

      <Divider />

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TeamBreakdown team={displayedDetail.home_team} t={t} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TeamBreakdown team={displayedDetail.away_team} t={t} />
        </Grid>
      </Grid>
    </Stack>
  )
}
