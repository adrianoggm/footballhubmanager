import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import LineupDragBuilder from '../../LineupDragBuilder.jsx'
import MatchDetailViewer from '../../MatchDetailViewer.jsx'
import {
  buildTrackedTeamScore,
  clampTrackedValue,
  isLiveTrackingStatus,
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

function TrackingMetricControl({ label, value, color, disabled, onDecrease, onIncrease }) {
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
        <Typography variant="h6" color={`${color}.main`} sx={{ fontWeight: 700, lineHeight: 1 }}>
          {clampTrackedValue(value)}
        </Typography>
        <Stack direction="row" spacing={0.75}>
          <Button
            size="small"
            variant="text"
            color={color}
            onClick={onDecrease}
            disabled={disabled}
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
            <Chip size="small" variant="outlined" label={player.position} />
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

function TrackingTeamPanel({
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
}

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
    handleQuickMatchEvent,
    handleCreateMatchEvent,
    handleDeleteMatchEvent,
    onMatchStatsDraftField,
    handleSaveMatchStats,
    closeMatchEditor,
  } = actions

  const selectedMatchEvents = selectedMatchDetail?.events || []
  const homeEventPlayers = (selectedMatchDetail?.home_team?.players || []).map((player) => ({
    guid: player.player_guid,
    label: formatPlayerDisplayName(player),
  }))
  const awayEventPlayers = (selectedMatchDetail?.away_team?.players || []).map((player) => ({
    guid: player.player_guid,
    label: formatPlayerDisplayName(player),
  }))
  const allEventPlayers = [...homeEventPlayers, ...awayEventPlayers]
  const primaryEventPlayers =
    matchEventDraft?.team_side === 'home'
      ? homeEventPlayers
      : matchEventDraft?.team_side === 'away'
        ? awayEventPlayers
        : allEventPlayers
  const relatedEventPlayers = allEventPlayers.filter(
    (player) => player.guid !== matchEventDraft?.player_guid
  )
  const eventCountsByPlayer = buildPlayerEventCounts(selectedMatchEvents)
  const selectedTrackedScore = buildTrackedTeamScore(selectedMatchDetail)
  const officiallyClosed = String(selectedMatchDetail?.status || '').toLowerCase() === 'closed'
  const trackingIsLive = isLiveTrackingStatus(selectedMatchDetail?.tracking_status)
  const trackingFinished =
    String(selectedMatchDetail?.tracking_status || '').toLowerCase() === 'finished'
  const timelineLocked = officiallyClosed
  const hasLineupAudit = Number(selectedMatchDetail?.lineup_change_count || 0) > 0
  const quickTrackingEnabled = Boolean(
    !officiallyClosed && trackingIsLive && !loading && !matchStatsLoading
  )
  const displayedElapsed = resolveDisplayedElapsed(selectedMatchDetail, nowEpoch)
  const workflowPhaseLabel = officiallyClosed
    ? t('dashboard.admin.matches.workflowPhaseClosed')
    : trackingIsLive
      ? t('dashboard.admin.matches.workflowPhaseLive')
      : trackingFinished || selectedMatchEvents.length > 0
        ? t('dashboard.admin.matches.workflowPhaseReview')
        : t('dashboard.admin.matches.workflowPhaseManual')
  const workflowSummary = officiallyClosed
    ? t('dashboard.admin.matches.workflowSummaryClosed')
    : trackingIsLive
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

  return (
    <Card variant="outlined" sx={{ mt: 1 }}>
      <CardContent>
        <Stack spacing={2}>
          <MatchDetailViewer
            detail={selectedMatchDetail}
            t={t}
            formatDate={formatDate}
            showSubtitle={false}
            onDeleteEvent={timelineLocked ? null : handleDeleteMatchEvent}
            deletingEventGuid={deletingMatchEventGuid}
          />

          <Divider />

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {t('dashboard.admin.matches.workflowsTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.admin.matches.workflowsDescription')}
            </Typography>
          </Box>

          <Alert severity={officiallyClosed || trackingIsLive ? 'success' : 'info'}>
            <Stack spacing={0.5}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {workflowPhaseLabel}
              </Typography>
              <Typography variant="body2">{workflowSummary}</Typography>
            </Stack>
          </Alert>

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

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems={{ sm: 'center' }}
                  flexWrap="wrap"
                  useFlexGap
                >
                  <Chip
                    size="small"
                    color={trackingChipColor(selectedMatchDetail.tracking_status)}
                    label={trackingLabel(selectedMatchDetail.tracking_status, t)}
                  />
                  <Button
                    variant="contained"
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
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={handleStopMatch}
                    disabled={
                      loading ||
                      matchStatsLoading ||
                      !isLiveTrackingStatus(selectedMatchDetail.tracking_status)
                    }
                  >
                    {t('dashboard.admin.matches.stopTracking')}
                  </Button>
                </Stack>

                <Box
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    px: 2,
                    py: 1.5,
                    backgroundColor: 'background.paper',
                  }}
                >
                  <Typography variant="overline" color="text.secondary">
                    {t('dashboard.admin.matches.liveClockLabel')}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                    {formatElapsedDuration(displayedElapsed)}
                  </Typography>
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
                    onAdjust={handleQuickMatchEvent}
                    formatPlayerDisplayName={formatPlayerDisplayName}
                    t={t}
                  />
                  <TrackingTeamPanel
                    team={selectedMatchDetail.away_team}
                    teamSide="away"
                    score={selectedTrackedScore?.away ?? selectedMatchDetail.away_team.score}
                    eventCountsByPlayer={eventCountsByPlayer}
                    disabled={!quickTrackingEnabled}
                    onAdjust={handleQuickMatchEvent}
                    formatPlayerDisplayName={formatPlayerDisplayName}
                    t={t}
                  />
                </Stack>

                {!timelineLocked && (
                  <>
                    <Divider />

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
                          value={matchEventDraft?.minute || ''}
                          onChange={onMatchEventDraftField('minute')}
                          inputProps={{ min: 0 }}
                        />
                      </Grid>
                      <Grid item xs={6} md={2}>
                        <TextField
                          type="number"
                          fullWidth
                          label={t('dashboard.admin.matches.eventSecond')}
                          value={matchEventDraft?.second || ''}
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
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Card
            variant="outlined"
            sx={{
              borderColor: officiallyClosed || trackingFinished ? 'primary.main' : 'divider',
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
                    selectedMatchDetail.home_team.team_name ||
                    t('dashboard.admin.matches.homeLineup')
                  }
                  awayTitle={
                    selectedMatchDetail.away_team.team_name ||
                    t('dashboard.admin.matches.awayLineup')
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
                    variant="outlined"
                    onClick={handleSaveMatchLineups}
                    disabled={loading || matchStatsLoading}
                  >
                    {t('dashboard.admin.matches.saveLineups')}
                  </Button>
                </Stack>

                <Grid container spacing={2}>
                  {[
                    { key: 'home_team', team: selectedMatchDetail.home_team },
                    { key: 'away_team', team: selectedMatchDetail.away_team },
                  ].map(({ key, team }) => (
                    <Grid key={key} item xs={12} lg={6} sx={{ minWidth: 0 }}>
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
                          {team.players.map((player) => (
                            <TableRow key={player.player_guid}>
                              <TableCell>{formatPlayerDisplayName(player)}</TableCell>
                              <TableCell>
                                <TextField
                                  type="number"
                                  size="small"
                                  value={
                                    matchStatsDraft[key]?.players.find(
                                      (item) => item.player_guid === player.player_guid
                                    )?.goals ?? '0'
                                  }
                                  onChange={onMatchStatsDraftField(key, player.player_guid, 'goals')}
                                  inputProps={{ min: 0 }}
                                  sx={{ maxWidth: 90 }}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  type="number"
                                  size="small"
                                  value={
                                    matchStatsDraft[key]?.players.find(
                                      (item) => item.player_guid === player.player_guid
                                    )?.assists ?? '0'
                                  }
                                  onChange={onMatchStatsDraftField(
                                    key,
                                    player.player_guid,
                                    'assists'
                                  )}
                                  inputProps={{ min: 0 }}
                                  sx={{ maxWidth: 90 }}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  type="number"
                                  size="small"
                                  value={
                                    matchStatsDraft[key]?.players.find(
                                      (item) => item.player_guid === player.player_guid
                                    )?.saves ?? '0'
                                  }
                                  onChange={onMatchStatsDraftField(key, player.player_guid, 'saves')}
                                  inputProps={{ min: 0 }}
                                  sx={{ maxWidth: 90 }}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  type="number"
                                  size="small"
                                  value={
                                    matchStatsDraft[key]?.players.find(
                                      (item) => item.player_guid === player.player_guid
                                    )?.rating ?? '0'
                                  }
                                  onChange={onMatchStatsDraftField(
                                    key,
                                    player.player_guid,
                                    'rating'
                                  )}
                                  inputProps={{ min: 0, step: 0.1 }}
                                  sx={{ maxWidth: 90 }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
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
            </CardContent>
          </Card>

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
