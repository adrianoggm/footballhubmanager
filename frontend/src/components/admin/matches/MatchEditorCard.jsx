import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Chip,
  Collapse,
  Divider,
  Grid,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { translatePositionLabel } from '../../../i18n/labels.js'
import { playGoalkeeperAlarm } from './goalkeeperAlarm.js'
import LineupDragBuilder from '../../LineupDragBuilder.jsx'
import MatchDetailViewer from '../../MatchDetailViewer.jsx'

// During live tracking a 1-second clock tick re-renders this editor; the
// memoized subtrees below (detail viewer, team panels, stats tables) keep that
// tick from re-rendering everything except the clock itself.
const MemoizedMatchDetailViewer = memo(MatchDetailViewer)
import {
  buildTrackedTeamScore,
  clampTrackedValue,
  isLiveTrackingStatus,
  isPausedTrackingStatus,
  resolveDisplayedElapsed,
  trackingChipColor,
  trackingLabel,
} from './trackingHelpers.js'

const MATCH_EVENT_TYPES = [
  'goal',
  'assist',
  'save',
  'foul',
  'yellow_card',
  'red_card',
  'sanction',
  'other',
]

const MATCH_EVENT_TYPES_WITH_OPTIONAL_PLAYER = new Set(['other'])
const QUICK_TRACKING_EVENT_TYPES = ['goal', 'assist', 'save', 'yellow_card', 'red_card']
const QUICK_TRACKING_EVENT_CONFIG = [
  { eventType: 'goal', color: 'success' },
  { eventType: 'assist', color: 'primary' },
  { eventType: 'save', color: 'info' },
  { eventType: 'yellow_card', color: 'warning' },
  { eventType: 'red_card', color: 'error' },
]

const buildPlayerEventCounts = (events) => {
  const byPlayer = new Map()
  ;(events || []).forEach((event) => {
    const playerGuid = String(event?.player_guid || '').trim()
    const eventType = String(event?.event_type || '')
      .trim()
      .toLowerCase()
    if (!playerGuid || !QUICK_TRACKING_EVENT_TYPES.includes(eventType)) {
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

function TrackingMetricControl({
  label,
  value,
  color,
  disabled,
  onDecrease,
  onIncrease,
  playerName,
}) {
  // a11y context for screen readers (audit UX-5): the bare -/+ glyphs carry no
  // meaning, so describe the metric and player on each control and announce the
  // count politely when it changes.
  const context = playerName ? `${label} · ${playerName}` : label
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 1.25,
        backgroundColor: 'background.default',
        minWidth: 0,
      }}
    >
      <Stack spacing={1}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography
          variant="h6"
          color={`${color}.main`}
          sx={{ fontWeight: 700, lineHeight: 1 }}
          aria-live="polite"
          aria-label={`${context}: ${clampTrackedValue(value)}`}
        >
          {clampTrackedValue(value)}
        </Typography>
        <Stack direction="row" spacing={0.75}>
          <Button
            size="small"
            variant="text"
            color={color}
            onClick={onDecrease}
            disabled={disabled}
            aria-label={`−1 ${context}`}
            sx={{ minWidth: 0, flex: 1 }}
          >
            -
          </Button>
          <Button
            size="small"
            variant="outlined"
            color={color}
            onClick={onIncrease}
            disabled={disabled}
            aria-label={`+1 ${context}`}
            sx={{ minWidth: 0, flex: 1 }}
          >
            +
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}

function TrackingPlayerCard({
  player,
  teamSide,
  eventCounts,
  disabled,
  onAdjust,
  formatPlayerDisplayName,
  t,
}) {
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        p: 1.5,
        backgroundColor: 'background.paper',
      }}
    >
      <Stack spacing={1.25}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {formatPlayerDisplayName(player)}
          </Typography>
          {player.position ? (
            <Chip
              size="small"
              variant="outlined"
              label={translatePositionLabel(t, player.position)}
            />
          ) : null}
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gap: 1,
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(0, 1fr))',
              xl: 'repeat(5, minmax(0, 1fr))',
            },
          }}
        >
          {QUICK_TRACKING_EVENT_CONFIG.map(({ eventType, color }) => (
            <TrackingMetricControl
              key={eventType}
              label={t(`dashboard.admin.matches.eventTypes.${eventType}`)}
              value={eventCounts[eventType] || 0}
              color={color}
              disabled={disabled}
              playerName={formatPlayerDisplayName(player)}
              onDecrease={() =>
                onAdjust({
                  eventType,
                  teamSide,
                  playerGuid: player.player_guid,
                  valueDelta: -1,
                })
              }
              onIncrease={() =>
                onAdjust({
                  eventType,
                  teamSide,
                  playerGuid: player.player_guid,
                  valueDelta: 1,
                })
              }
            />
          ))}
        </Box>
      </Stack>
    </Box>
  )
}

const TrackingTeamPanel = memo(function TrackingTeamPanel({
  team,
  teamSide,
  score,
  eventCountsByPlayer,
  disabled,
  onAdjust,
  formatPlayerDisplayName,
  t,
}) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ sm: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                color={teamSide === 'home' ? 'primary' : 'secondary'}
                label={t(`dashboard.admin.matches.teamSides.${teamSide}`)}
              />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {team.team_name}
              </Typography>
            </Stack>
            <Chip
              size="small"
              color="primary"
              label={t('dashboard.common.matchDetail.teamScore', { score: score ?? 0 })}
            />
          </Stack>

          <Stack spacing={1.25}>
            {team.players.map((player) => (
              <TrackingPlayerCard
                key={player.player_guid}
                player={player}
                teamSide={teamSide}
                eventCounts={
                  eventCountsByPlayer.get(player.player_guid) || {
                    goal: 0,
                    assist: 0,
                    save: 0,
                    yellow_card: 0,
                    red_card: 0,
                  }
                }
                disabled={disabled}
                onAdjust={onAdjust}
                formatPlayerDisplayName={formatPlayerDisplayName}
                t={t}
              />
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
})

const TeamStatsTable = memo(function TeamStatsTable({
  teamKey,
  team,
  draftPlayers,
  onMatchStatsDraftField,
  formatPlayerDisplayName,
  t,
}) {
  return (
    <>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {t('dashboard.admin.matches.teamStats', { team: team.team_name })}
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('dashboard.admin.table.player')}</TableCell>
            <TableCell>{t('dashboard.admin.matches.goals')}</TableCell>
            <TableCell>{t('dashboard.admin.matches.assists')}</TableCell>
            <TableCell>{t('dashboard.admin.matches.saves')}</TableCell>
            <TableCell>{t('dashboard.admin.matches.rating')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {team.players.map((player) => {
            const draft = (draftPlayers || []).find(
              (item) => item.player_guid === player.player_guid
            )
            return (
              <TableRow key={player.player_guid}>
                <TableCell>{formatPlayerDisplayName(player)}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={draft?.goals ?? '0'}
                    onChange={onMatchStatsDraftField(teamKey, player.player_guid, 'goals')}
                    inputProps={{ min: 0 }}
                    sx={{ maxWidth: 90 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={draft?.assists ?? '0'}
                    onChange={onMatchStatsDraftField(teamKey, player.player_guid, 'assists')}
                    inputProps={{ min: 0 }}
                    sx={{ maxWidth: 90 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={draft?.saves ?? '0'}
                    onChange={onMatchStatsDraftField(teamKey, player.player_guid, 'saves')}
                    inputProps={{ min: 0 }}
                    sx={{ maxWidth: 90 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={draft?.rating ?? '0'}
                    onChange={onMatchStatsDraftField(teamKey, player.player_guid, 'rating')}
                    inputProps={{ min: 0, step: 0.1 }}
                    sx={{ maxWidth: 90 }}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </>
  )
})

/**
 * Match editor: detail viewer + live tracking (clock, quick per-player events),
 * manual event form, lineup editing, and the manual stats report. Extracted from
 * AdminMatchesSection; owns only presentation-local state (the live clock tick),
 * all data state stays in the dashboard and arrives via the section bundles.
 */
export default function MatchEditorCard({ state, actions, helpers }) {
  const { t, formatDate, formatElapsedDuration, formatPlayerDisplayName } = helpers
  const [nowEpoch, setNowEpoch] = useState(() => Math.floor(Date.now() / 1000))
  const {
    loading,
    matchStatsLoading,
    selectedMatchDetail,
    matchStatsDraft,
    matchEventDraft,
    deletingMatchEventGuid,
    matchEditorLineupPlayers,
    matchDraftHomeGuids,
    matchDraftAwayGuids,
  } = state
  const {
    onMatchLineupsDraftChange,
    handleSaveMatchLineups,
    onMatchEventDraftField,
    handleStartMatch,
    handleStopMatch,
    handlePauseMatch,
    handleResumeMatch,
    handleSetGoalkeeperRotation,
    handleQuickMatchEvent,
    handleCreateMatchEvent,
    handleDeleteMatchEvent,
    onMatchStatsDraftField,
    handleSaveMatchStats,
    closeMatchEditor,
  } = actions

  const selectedMatchEvents = useMemo(
    () => selectedMatchDetail?.events || [],
    [selectedMatchDetail?.events]
  )
  const homeEventPlayers = useMemo(
    () =>
      (selectedMatchDetail?.home_team?.players || []).map((player) => ({
        guid: player.player_guid,
        label: formatPlayerDisplayName(player),
      })),
    [selectedMatchDetail?.home_team?.players, formatPlayerDisplayName]
  )
  const awayEventPlayers = useMemo(
    () =>
      (selectedMatchDetail?.away_team?.players || []).map((player) => ({
        guid: player.player_guid,
        label: formatPlayerDisplayName(player),
      })),
    [selectedMatchDetail?.away_team?.players, formatPlayerDisplayName]
  )
  const allEventPlayers = useMemo(
    () => [...homeEventPlayers, ...awayEventPlayers],
    [homeEventPlayers, awayEventPlayers]
  )
  const primaryEventPlayers =
    matchEventDraft?.team_side === 'home'
      ? homeEventPlayers
      : matchEventDraft?.team_side === 'away'
        ? awayEventPlayers
        : allEventPlayers
  const relatedEventPlayers = useMemo(
    () => allEventPlayers.filter((player) => player.guid !== matchEventDraft?.player_guid),
    [allEventPlayers, matchEventDraft?.player_guid]
  )
  const eventCountsByPlayer = useMemo(
    () => buildPlayerEventCounts(selectedMatchEvents),
    [selectedMatchEvents]
  )
  const selectedTrackedScore = useMemo(
    () => buildTrackedTeamScore(selectedMatchDetail),
    [selectedMatchDetail]
  )
  const officiallyClosed = String(selectedMatchDetail?.status || '').toLowerCase() === 'closed'
  const trackingIsLive = isLiveTrackingStatus(selectedMatchDetail?.tracking_status)
  const trackingIsPaused = isPausedTrackingStatus(selectedMatchDetail?.tracking_status)
  const trackingFinished =
    String(selectedMatchDetail?.tracking_status || '').toLowerCase() === 'finished'
  // UX-6: color the clock by state so it reads at a glance on the touchline.
  const clockColorKey = trackingIsLive
    ? 'success'
    : trackingIsPaused
      ? 'warning'
      : trackingFinished
        ? 'info'
        : null
  const timelineLocked = officiallyClosed
  const hasLineupAudit = Number(selectedMatchDetail?.lineup_change_count || 0) > 0
  const quickTrackingEnabled = Boolean(
    !officiallyClosed && trackingIsLive && !loading && !matchStatsLoading
  )
  const displayedElapsed = resolveDisplayedElapsed(selectedMatchDetail, nowEpoch)
  // FE-6: stamp the running clock onto quick events so live goals/saves get a
  // minute on the timeline instead of posting elapsed_seconds: null.
  const handleQuickAdjust = useCallback(
    (payload) =>
      handleQuickMatchEvent({
        ...payload,
        elapsedSeconds: trackingIsLive ? displayedElapsed : null,
      }),
    [handleQuickMatchEvent, trackingIsLive, displayedElapsed]
  )
  const goalkeeperRotationSeconds = Number(selectedMatchDetail?.goalkeeper_rotation_seconds || 0)
  const goalkeeperRotationEnabled = goalkeeperRotationSeconds > 0
  // Seconds left until the next goalkeeper rotation cycle while the clock runs.
  const secondsToNextRotation =
    goalkeeperRotationEnabled && trackingIsLive
      ? goalkeeperRotationSeconds - (displayedElapsed % goalkeeperRotationSeconds)
      : null
  const workflowPhaseLabel = officiallyClosed
    ? t('dashboard.admin.matches.workflowPhaseClosed')
    : trackingIsLive || trackingIsPaused
      ? t('dashboard.admin.matches.workflowPhaseLive')
      : trackingFinished || selectedMatchEvents.length > 0
        ? t('dashboard.admin.matches.workflowPhaseReview')
        : t('dashboard.admin.matches.workflowPhaseManual')
  const workflowSummary = officiallyClosed
    ? t('dashboard.admin.matches.workflowSummaryClosed')
    : trackingIsLive || trackingIsPaused
      ? t('dashboard.admin.matches.workflowSummaryLive')
      : trackingFinished || selectedMatchEvents.length > 0
        ? t('dashboard.admin.matches.workflowSummaryReview')
        : t('dashboard.admin.matches.workflowSummaryManual')
  const officialScoreLabel = t('dashboard.admin.matches.finalScore', {
    score: `${selectedMatchDetail?.home_team?.score ?? 0} - ${selectedMatchDetail?.away_team?.score ?? 0}`,
  })

  useEffect(() => {
    if (!isLiveTrackingStatus(selectedMatchDetail?.tracking_status)) {
      return undefined
    }
    setNowEpoch(Math.floor(Date.now() / 1000))
    const timerId = window.setInterval(() => {
      setNowEpoch(Math.floor(Date.now() / 1000))
    }, 1000)
    return () => window.clearInterval(timerId)
  }, [selectedMatchDetail?.tracking_status, selectedMatchDetail?.started_at_epoch])

  // Goalkeeper rotation alarm: a configurable interval (default 10 min) that, once
  // the live clock crosses each multiple, fires a 5s beep + visual cue prompting a
  // goalkeeper change. The interval can be tuned at any time and is persisted.
  const [rotationMinutesInput, setRotationMinutesInput] = useState(() =>
    String(Math.round(goalkeeperRotationSeconds / 60))
  )
  const [rotationAlarmActive, setRotationAlarmActive] = useState(false)
  const [rotationAlarmCycle, setRotationAlarmCycle] = useState(0)
  const lastRotationCycleRef = useRef(null)
  const alarmStopRef = useRef(null)

  // Keep the editable field in sync with the persisted value (after save / when
  // switching matches), without clobbering edits to an unrelated field.
  useEffect(() => {
    setRotationMinutesInput(String(Math.round(goalkeeperRotationSeconds / 60)))
  }, [goalkeeperRotationSeconds, selectedMatchDetail?.guid])

  // Reset the cycle baseline whenever the interval, the match or the live state
  // changes, so tuning the interval mid-match never fires the alarm retroactively.
  useEffect(() => {
    lastRotationCycleRef.current = null
  }, [goalkeeperRotationSeconds, selectedMatchDetail?.guid, trackingIsLive])

  useEffect(() => {
    if (!trackingIsLive || goalkeeperRotationSeconds <= 0) {
      return
    }
    const currentCycle = Math.floor(displayedElapsed / goalkeeperRotationSeconds)
    if (lastRotationCycleRef.current === null) {
      // First observation while live: adopt the current cycle as the baseline so
      // reopening the match mid-cycle does not replay an already-passed boundary.
      lastRotationCycleRef.current = currentCycle
      return
    }
    if (currentCycle > lastRotationCycleRef.current && currentCycle >= 1) {
      lastRotationCycleRef.current = currentCycle
      alarmStopRef.current?.()
      alarmStopRef.current = playGoalkeeperAlarm(5000)
      setRotationAlarmCycle(currentCycle)
      setRotationAlarmActive(true)
    }
  }, [trackingIsLive, goalkeeperRotationSeconds, displayedElapsed])

  // Silence and clear the alarm when the match leaves the live state or changes.
  useEffect(() => {
    if (trackingIsLive) {
      return
    }
    alarmStopRef.current?.()
    alarmStopRef.current = null
    setRotationAlarmActive(false)
  }, [trackingIsLive, selectedMatchDetail?.guid])

  // Stop any scheduled audio on unmount.
  useEffect(
    () => () => {
      alarmStopRef.current?.()
      alarmStopRef.current = null
    },
    []
  )

  const dismissRotationAlarm = () => {
    alarmStopRef.current?.()
    alarmStopRef.current = null
    setRotationAlarmActive(false)
  }

  const handleApplyRotation = () => {
    const minutes = Math.min(120, Math.max(0, Math.floor(Number(rotationMinutesInput) || 0)))
    handleSetGoalkeeperRotation(minutes * 60)
  }

  const rotationInputSeconds =
    Math.min(120, Math.max(0, Math.floor(Number(rotationMinutesInput) || 0))) * 60
  const rotationDirty = rotationInputSeconds !== goalkeeperRotationSeconds

  // Progressive disclosure: the editor splits into task tabs (summary / live
  // tracking / lineups / stats) and follows the match state — opening a live
  // match lands on tracking, a finished one on the stats report.
  const [editorTab, setEditorTab] = useState('summary')
  const [showManualEvent, setShowManualEvent] = useState(false)
  useEffect(() => {
    if (officiallyClosed) {
      setEditorTab('summary')
    } else if (trackingIsLive || trackingIsPaused) {
      setEditorTab('tracking')
    } else if (trackingFinished) {
      setEditorTab('stats')
    } else {
      setEditorTab('summary')
    }
    setShowManualEvent(false)
    // Re-evaluate only when the edited match or its phase changes.
  }, [
    selectedMatchDetail?.guid,
    officiallyClosed,
    trackingIsLive,
    trackingIsPaused,
    trackingFinished,
  ])

  return (
    <Card variant="outlined" sx={{ mt: 1 }}>
      <CardContent>
        <Stack spacing={2}>
          <Alert severity={officiallyClosed || trackingIsLive ? 'success' : 'info'}>
            <Stack spacing={0.5}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {workflowPhaseLabel}
              </Typography>
              <Typography variant="body2">{workflowSummary}</Typography>
            </Stack>
          </Alert>

          <Tabs
            value={editorTab}
            onChange={(_, next) => setEditorTab(next)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab value="summary" label={t('dashboard.admin.matches.editorTabSummary')} />
            <Tab value="tracking" label={t('dashboard.admin.matches.editorTabTracking')} />
            <Tab value="lineups" label={t('dashboard.admin.matches.editorTabLineups')} />
            <Tab value="stats" label={t('dashboard.admin.matches.editorTabStats')} />
          </Tabs>

          {editorTab === 'summary' && (
            <MemoizedMatchDetailViewer
              detail={selectedMatchDetail}
              t={t}
              formatDate={formatDate}
              showSubtitle={false}
              onDeleteEvent={timelineLocked ? null : handleDeleteMatchEvent}
              deletingEventGuid={deletingMatchEventGuid}
            />
          )}

          {editorTab === 'tracking' && (
            <Card
              variant="outlined"
              sx={{
                borderColor: trackingIsLive ? 'success.main' : 'divider',
              }}
            >
              <CardContent>
                <Stack spacing={2}>
                  <Box>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      alignItems={{ sm: 'center' }}
                      justifyContent="space-between"
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {t('dashboard.admin.matches.trackingSectionTitle')}
                      </Typography>
                      {trackingIsLive ? (
                        <Chip
                          size="small"
                          color="success"
                          label={t('dashboard.admin.matches.workflowRecommended')}
                        />
                      ) : null}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {t('dashboard.admin.matches.trackingDescription')}
                    </Typography>
                  </Box>

                  {/* UX-7: prominent centered scoreboard — the most-watched number. */}
                  <Box
                    sx={(theme) => ({
                      borderRadius: 3,
                      px: 3,
                      py: 2,
                      backgroundColor: alpha(theme.palette.text.primary, 0.04),
                      border: '1px solid',
                      borderColor: 'divider',
                    })}
                  >
                    <Stack
                      direction="row"
                      spacing={{ xs: 2, sm: 4 }}
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Stack spacing={0.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="overline"
                          color="primary.main"
                          sx={{ fontWeight: 700 }}
                          noWrap
                        >
                          {selectedMatchDetail.home_team.team_name}
                        </Typography>
                        <Typography variant="h2" sx={{ fontWeight: 800, lineHeight: 1 }}>
                          {selectedTrackedScore?.home ?? selectedMatchDetail.home_team.score ?? 0}
                        </Typography>
                      </Stack>
                      <Typography variant="h3" color="text.disabled" sx={{ fontWeight: 300 }}>
                        –
                      </Typography>
                      <Stack spacing={0.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="overline"
                          color="secondary.main"
                          sx={{ fontWeight: 700 }}
                          noWrap
                        >
                          {selectedMatchDetail.away_team.team_name}
                        </Typography>
                        <Typography variant="h2" sx={{ fontWeight: 800, lineHeight: 1 }}>
                          {selectedTrackedScore?.away ?? selectedMatchDetail.away_team.score ?? 0}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Box>

                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems={{ sm: 'center' }}
                    flexWrap="wrap"
                    useFlexGap
                  >
                    {/* UX-6: group the transport into a segmented control; Stop kept apart. */}
                    <ButtonGroup variant="contained" disableElevation>
                      <Button
                        color="success"
                        onClick={handleStartMatch}
                        disabled={
                          loading ||
                          matchStatsLoading ||
                          officiallyClosed ||
                          selectedMatchDetail.tracking_status !== 'not_started' ||
                          selectedMatchEvents.length > 0
                        }
                      >
                        {t('dashboard.admin.matches.startTracking')}
                      </Button>
                      {trackingIsPaused ? (
                        <Button
                          color="warning"
                          onClick={handleResumeMatch}
                          disabled={loading || matchStatsLoading}
                        >
                          {t('dashboard.admin.matches.resumeTracking')}
                        </Button>
                      ) : (
                        <Button
                          color="warning"
                          onClick={handlePauseMatch}
                          disabled={loading || matchStatsLoading || !trackingIsLive}
                        >
                          {t('dashboard.admin.matches.pauseTracking')}
                        </Button>
                      )}
                    </ButtonGroup>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleStopMatch}
                      disabled={
                        loading || matchStatsLoading || !(trackingIsLive || trackingIsPaused)
                      }
                    >
                      {t('dashboard.admin.matches.stopTracking')}
                    </Button>
                  </Stack>

                  {trackingIsPaused && (
                    <Alert severity="warning">
                      {t('dashboard.admin.matches.trackingPausedHint')}
                    </Alert>
                  )}

                  <Box
                    sx={(theme) => {
                      const tint = clockColorKey
                        ? theme.palette[clockColorKey].main
                        : theme.palette.text.secondary
                      return {
                        border: '1px solid',
                        borderColor: clockColorKey ? alpha(tint, 0.5) : 'divider',
                        borderRadius: 2,
                        px: 2,
                        py: 1.5,
                        backgroundColor: alpha(tint, 0.08),
                      }
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      {trackingIsLive ? (
                        <Box
                          component="span"
                          aria-hidden
                          sx={(theme) => ({
                            width: 9,
                            height: 9,
                            borderRadius: '50%',
                            bgcolor: theme.palette.success.main,
                            animation: 'liveClockPulse 1.2s ease-in-out infinite',
                            '@keyframes liveClockPulse': {
                              '0%, 100%': { opacity: 1 },
                              '50%': { opacity: 0.25 },
                            },
                            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                          })}
                        />
                      ) : null}
                      <Typography
                        variant="overline"
                        sx={{ color: clockColorKey ? `${clockColorKey}.main` : 'text.secondary' }}
                      >
                        {clockColorKey
                          ? trackingLabel(selectedMatchDetail.tracking_status, t)
                          : t('dashboard.admin.matches.liveClockLabel')}
                      </Typography>
                    </Stack>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 700,
                        lineHeight: 1.1,
                        color: clockColorKey ? `${clockColorKey}.main` : 'text.primary',
                      }}
                    >
                      {formatElapsedDuration(displayedElapsed)}
                    </Typography>
                  </Box>

                  {rotationAlarmActive && (
                    <Box
                      role="alert"
                      sx={(theme) => ({
                        borderRadius: 2,
                        px: 2,
                        py: 1.5,
                        color: theme.palette.error.contrastText,
                        backgroundColor: theme.palette.error.main,
                        animation: 'gkAlarmFlash 0.9s steps(1, end) infinite',
                        '@keyframes gkAlarmFlash': {
                          '0%, 100%': { backgroundColor: theme.palette.error.main },
                          '50%': { backgroundColor: theme.palette.warning.main },
                        },
                        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                      })}
                    >
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.5}
                        alignItems={{ sm: 'center' }}
                        justifyContent="space-between"
                      >
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                          {t('dashboard.admin.matches.goalkeeperRotationAlarm', {
                            cycle: rotationAlarmCycle,
                          })}
                        </Typography>
                        <Button
                          variant="contained"
                          color="inherit"
                          onClick={dismissRotationAlarm}
                          sx={{ color: 'error.main', fontWeight: 700, flexShrink: 0 }}
                        >
                          {t('dashboard.admin.matches.goalkeeperRotationSilence')}
                        </Button>
                      </Stack>
                    </Box>
                  )}

                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      px: 2,
                      py: 1.5,
                    }}
                  >
                    <Typography variant="overline" color="text.secondary">
                      {t('dashboard.admin.matches.goalkeeperRotationLabel')}
                    </Typography>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      alignItems={{ sm: 'center' }}
                      useFlexGap
                      flexWrap="wrap"
                    >
                      <TextField
                        type="number"
                        size="small"
                        label={t('dashboard.admin.matches.goalkeeperRotationMinutes')}
                        value={rotationMinutesInput}
                        onChange={(event) => setRotationMinutesInput(event.target.value)}
                        inputProps={{ min: 0, max: 120, step: 1 }}
                        disabled={loading || matchStatsLoading}
                        sx={{ maxWidth: 160 }}
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleApplyRotation}
                        disabled={loading || matchStatsLoading || !rotationDirty}
                      >
                        {t('dashboard.admin.matches.goalkeeperRotationApply')}
                      </Button>
                      {goalkeeperRotationEnabled && secondsToNextRotation != null ? (
                        <Chip
                          color={secondsToNextRotation <= 60 ? 'warning' : 'default'}
                          variant={secondsToNextRotation <= 60 ? 'filled' : 'outlined'}
                          label={t('dashboard.admin.matches.goalkeeperRotationNext', {
                            time: formatElapsedDuration(secondsToNextRotation),
                          })}
                          sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {!goalkeeperRotationEnabled
                            ? t('dashboard.admin.matches.goalkeeperRotationDisabled')
                            : t('dashboard.admin.matches.goalkeeperRotationHint')}
                        </Typography>
                      )}
                    </Stack>
                  </Box>

                  <Alert
                    severity={
                      isLiveTrackingStatus(selectedMatchDetail.tracking_status) ? 'success' : 'info'
                    }
                  >
                    {isLiveTrackingStatus(selectedMatchDetail.tracking_status)
                      ? t('dashboard.admin.matches.eventTimeHelperLive')
                      : t('dashboard.admin.matches.eventTimeHelperManual')}
                  </Alert>

                  {officiallyClosed && (
                    <Alert severity="warning">
                      {t('dashboard.admin.matches.timelineClosedHint')}
                    </Alert>
                  )}

                  {hasLineupAudit && (
                    <Alert severity="warning">
                      {t('dashboard.admin.matches.lineupAuditHint', {
                        count: selectedMatchDetail.lineup_change_count,
                      })}
                    </Alert>
                  )}

                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {t('dashboard.admin.matches.quickTrackingTitle')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('dashboard.admin.matches.quickTrackingDescription')}
                    </Typography>
                  </Box>

                  {!quickTrackingEnabled && (
                    <Alert severity="info">
                      {t('dashboard.admin.matches.quickTrackingDisabledHint')}
                    </Alert>
                  )}

                  <Stack spacing={2}>
                    <TrackingTeamPanel
                      team={selectedMatchDetail.home_team}
                      teamSide="home"
                      score={selectedTrackedScore?.home ?? selectedMatchDetail.home_team.score}
                      eventCountsByPlayer={eventCountsByPlayer}
                      disabled={!quickTrackingEnabled}
                      onAdjust={handleQuickAdjust}
                      formatPlayerDisplayName={formatPlayerDisplayName}
                      t={t}
                    />
                    <TrackingTeamPanel
                      team={selectedMatchDetail.away_team}
                      teamSide="away"
                      score={selectedTrackedScore?.away ?? selectedMatchDetail.away_team.score}
                      eventCountsByPlayer={eventCountsByPlayer}
                      disabled={!quickTrackingEnabled}
                      onAdjust={handleQuickAdjust}
                      formatPlayerDisplayName={formatPlayerDisplayName}
                      t={t}
                    />
                  </Stack>

                  {!timelineLocked && (
                    <>
                      <Divider />

                      <Button
                        variant="text"
                        size="small"
                        onClick={() => setShowManualEvent((previous) => !previous)}
                        sx={{ alignSelf: 'flex-start' }}
                      >
                        {showManualEvent
                          ? t('dashboard.admin.matches.manualEventHide')
                          : t('dashboard.admin.matches.manualEventShow')}
                      </Button>

                      <Collapse in={showManualEvent}>
                        <Stack spacing={2}>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {t('dashboard.admin.matches.manualEventTitle')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {t('dashboard.admin.matches.manualEventDescription')}
                            </Typography>
                          </Box>

                          <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                              <TextField
                                select
                                fullWidth
                                label={t('dashboard.admin.matches.eventType')}
                                value={matchEventDraft?.event_type || 'goal'}
                                onChange={onMatchEventDraftField('event_type')}
                              >
                                {MATCH_EVENT_TYPES.map((eventType) => (
                                  <MenuItem key={eventType} value={eventType}>
                                    {t(`dashboard.admin.matches.eventTypes.${eventType}`)}
                                  </MenuItem>
                                ))}
                              </TextField>
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <TextField
                                select
                                fullWidth
                                label={t('dashboard.admin.matches.teamSide')}
                                value={matchEventDraft?.team_side || 'home'}
                                onChange={onMatchEventDraftField('team_side')}
                              >
                                {['home', 'away', 'neutral'].map((teamSide) => (
                                  <MenuItem key={teamSide} value={teamSide}>
                                    {t(`dashboard.admin.matches.teamSides.${teamSide}`)}
                                  </MenuItem>
                                ))}
                              </TextField>
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <TextField
                                select
                                fullWidth
                                label={t('dashboard.admin.matches.eventAction')}
                                value={matchEventDraft?.value_delta || '1'}
                                onChange={onMatchEventDraftField('value_delta')}
                              >
                                <MenuItem value="1">
                                  {t('dashboard.admin.matches.eventDeltaAdd')}
                                </MenuItem>
                                <MenuItem value="-1">
                                  {t('dashboard.admin.matches.eventDeltaSubtract')}
                                </MenuItem>
                              </TextField>
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <TextField
                                select
                                fullWidth
                                label={t('dashboard.admin.matches.eventPlayer')}
                                value={matchEventDraft?.player_guid || ''}
                                onChange={onMatchEventDraftField('player_guid')}
                                disabled={
                                  !primaryEventPlayers.length &&
                                  !MATCH_EVENT_TYPES_WITH_OPTIONAL_PLAYER.has(
                                    matchEventDraft?.event_type || ''
                                  )
                                }
                              >
                                <MenuItem value="">
                                  {MATCH_EVENT_TYPES_WITH_OPTIONAL_PLAYER.has(
                                    matchEventDraft?.event_type || ''
                                  )
                                    ? t('dashboard.admin.matches.eventPlayerOptional')
                                    : t('dashboard.admin.matches.eventPlayerSelect')}
                                </MenuItem>
                                {primaryEventPlayers.map((player) => (
                                  <MenuItem key={player.guid} value={player.guid}>
                                    {player.label}
                                  </MenuItem>
                                ))}
                              </TextField>
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <TextField
                                select
                                fullWidth
                                label={t('dashboard.admin.matches.eventRelatedPlayer')}
                                value={matchEventDraft?.related_player_guid || ''}
                                onChange={onMatchEventDraftField('related_player_guid')}
                              >
                                <MenuItem value="">
                                  {t('dashboard.admin.matches.eventRelatedPlayerOptional')}
                                </MenuItem>
                                {relatedEventPlayers.map((player) => (
                                  <MenuItem key={player.guid} value={player.guid}>
                                    {player.label}
                                  </MenuItem>
                                ))}
                              </TextField>
                            </Grid>
                            <Grid item xs={6} md={2}>
                              <TextField
                                type="number"
                                fullWidth
                                label={t('dashboard.admin.matches.eventMinute')}
                                value={matchEventDraft?.minute ?? ''}
                                onChange={onMatchEventDraftField('minute')}
                                inputProps={{ min: 0 }}
                              />
                            </Grid>
                            <Grid item xs={6} md={2}>
                              <TextField
                                type="number"
                                fullWidth
                                label={t('dashboard.admin.matches.eventSecond')}
                                value={matchEventDraft?.second ?? ''}
                                onChange={onMatchEventDraftField('second')}
                                inputProps={{ min: 0, max: 59 }}
                              />
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <TextField
                                fullWidth
                                label={t('dashboard.admin.matches.eventNote')}
                                value={matchEventDraft?.note || ''}
                                onChange={onMatchEventDraftField('note')}
                                placeholder={t('dashboard.admin.matches.eventNotePlaceholder')}
                              />
                            </Grid>
                          </Grid>

                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <Button
                              variant="contained"
                              onClick={handleCreateMatchEvent}
                              disabled={loading || matchStatsLoading}
                            >
                              {t('dashboard.admin.matches.createEvent')}
                            </Button>
                          </Stack>
                        </Stack>
                      </Collapse>
                    </>
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}

          {editorTab === 'lineups' && (
            <Stack spacing={2}>
              {hasLineupAudit && (
                <Alert severity="warning">
                  {t('dashboard.admin.matches.lineupAuditHint', {
                    count: selectedMatchDetail.lineup_change_count,
                  })}
                </Alert>
              )}

              <LineupDragBuilder
                players={matchEditorLineupPlayers}
                homeGuids={matchDraftHomeGuids}
                awayGuids={matchDraftAwayGuids}
                onChange={onMatchLineupsDraftChange}
                availableTitle={t('dashboard.admin.matches.availablePlayers')}
                homeTitle={
                  selectedMatchDetail.home_team.team_name || t('dashboard.admin.matches.homeLineup')
                }
                awayTitle={
                  selectedMatchDetail.away_team.team_name || t('dashboard.admin.matches.awayLineup')
                }
                helperText={t('dashboard.admin.matches.lineupBoardHint')}
                emptyText={t('dashboard.admin.matches.lineupEmpty')}
                addHomeText={t('dashboard.admin.matches.addToHome')}
                addAwayText={t('dashboard.admin.matches.addToAway')}
                moveHomeText={t('dashboard.admin.matches.moveToHome')}
                moveAwayText={t('dashboard.admin.matches.moveToAway')}
                removeText={t('dashboard.admin.matches.removeFromLineup')}
                disabled={loading || matchStatsLoading}
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                  variant="contained"
                  onClick={handleSaveMatchLineups}
                  disabled={loading || matchStatsLoading}
                >
                  {t('dashboard.admin.matches.saveLineups')}
                </Button>
              </Stack>
            </Stack>
          )}

          {editorTab === 'stats' && (
            <Stack spacing={2}>
              <Box>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems={{ sm: 'center' }}
                  justifyContent="space-between"
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {t('dashboard.admin.matches.reportSectionTitle')}
                  </Typography>
                  {officiallyClosed || trackingFinished ? (
                    <Chip
                      size="small"
                      color="primary"
                      label={t('dashboard.admin.matches.workflowRecommended')}
                    />
                  ) : null}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.admin.matches.manualResultTitle', {
                    home: selectedMatchDetail.home_team.team_name,
                    away: selectedMatchDetail.away_team.team_name,
                  })}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.admin.matches.manualResultDescription')}
                </Typography>
              </Box>

              <Alert severity="info">{t('dashboard.admin.matches.manualResultHint')}</Alert>

              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.admin.matches.status')}:
                </Typography>
                <Chip
                  size="small"
                  color={selectedMatchDetail.status === 'closed' ? 'success' : 'warning'}
                  label={
                    selectedMatchDetail.status === 'closed'
                      ? t('dashboard.admin.matches.statusClosed')
                      : t('dashboard.admin.matches.statusOpen')
                  }
                />
                <Chip
                  size="small"
                  color={trackingChipColor(selectedMatchDetail.tracking_status)}
                  label={trackingLabel(selectedMatchDetail.tracking_status, t)}
                />
                <Chip size="small" variant="outlined" label={officialScoreLabel} />
              </Stack>

              {selectedMatchDetail.status === 'closed' && (
                <Alert severity="warning">
                  {t('dashboard.admin.matches.closedMatchEditableHint')}
                </Alert>
              )}

              <Grid container spacing={2}>
                {[
                  { key: 'home_team', team: selectedMatchDetail.home_team },
                  { key: 'away_team', team: selectedMatchDetail.away_team },
                ].map(({ key, team }) => (
                  <Grid key={key} item xs={12} lg={6} sx={{ minWidth: 0 }}>
                    <TeamStatsTable
                      teamKey={key}
                      team={team}
                      draftPlayers={matchStatsDraft[key]?.players}
                      onMatchStatsDraftField={onMatchStatsDraftField}
                      formatPlayerDisplayName={formatPlayerDisplayName}
                      t={t}
                    />
                  </Grid>
                ))}
              </Grid>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                  variant="contained"
                  onClick={handleSaveMatchStats}
                  disabled={loading || matchStatsLoading}
                >
                  {t('dashboard.admin.matches.saveStats')}
                </Button>
              </Stack>
            </Stack>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button variant="text" onClick={closeMatchEditor} disabled={loading}>
              {t('dashboard.admin.matches.closeEditor')}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}
