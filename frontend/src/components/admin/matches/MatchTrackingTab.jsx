import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { memo } from 'react'

import { translatePositionLabel } from '../../../i18n/labels.js'
import ManualEventForm from './ManualEventForm.jsx'
import { clampTrackedValue, isLiveTrackingStatus, trackingLabel } from './trackingHelpers.js'

const QUICK_TRACKING_EVENT_CONFIG = [
  { eventType: 'goal', color: 'success' },
  { eventType: 'assist', color: 'primary' },
  { eventType: 'save', color: 'info' },
  { eventType: 'yellow_card', color: 'warning' },
  { eventType: 'red_card', color: 'error' },
]

function TrackingMetricControl({
  label,
  value,
  color,
  disabled,
  onDecrease,
  onIncrease,
  playerName,
}) {
  const context = playerName ? `${label} - ${playerName}` : label
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
                onAdjust({ eventType, teamSide, playerGuid: player.player_guid, valueDelta: -1 })
              }
              onIncrease={() =>
                onAdjust({ eventType, teamSide, playerGuid: player.player_guid, valueDelta: 1 })
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
                eventCounts={eventCountsByPlayer.get(player.player_guid) || {}}
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

export default function MatchTrackingTab({
  selectedMatchDetail,
  selectedTrackedScore,
  selectedMatchEvents,
  trackingIsLive,
  trackingIsPaused,
  officiallyClosed,
  timelineLocked,
  hasLineupAudit,
  clockColorKey,
  displayedElapsed,
  formatElapsedDuration,
  handleStartMatch,
  handleResumeMatch,
  handlePauseMatch,
  handleStopMatch,
  loading,
  matchStatsLoading,
  rotationAlarmActive,
  rotationAlarmCycle,
  dismissRotationAlarm,
  rotationMinutesInput,
  setRotationMinutesInput,
  handleApplyRotation,
  rotationDirty,
  goalkeeperRotationEnabled,
  secondsToNextRotation,
  quickTrackingEnabled,
  eventCountsByPlayer,
  handleQuickAdjust,
  formatPlayerDisplayName,
  showManualEvent,
  setShowManualEvent,
  matchEventDraft,
  onMatchEventDraftField,
  handleCreateMatchEvent,
  primaryEventPlayers,
  relatedEventPlayers,
  t,
}) {
  return (
    <Card variant="outlined" sx={{ borderColor: trackingIsLive ? 'success.main' : 'divider' }}>
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
                <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700 }} noWrap>
                  {selectedMatchDetail.home_team.team_name}
                </Typography>
                <Typography variant="h2" sx={{ fontWeight: 800, lineHeight: 1 }}>
                  {selectedTrackedScore?.home ?? selectedMatchDetail.home_team.score ?? 0}
                </Typography>
              </Stack>
              <Typography variant="h3" color="text.disabled" sx={{ fontWeight: 300 }}>
                -
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
              disabled={loading || matchStatsLoading || !(trackingIsLive || trackingIsPaused)}
            >
              {t('dashboard.admin.matches.stopTracking')}
            </Button>
          </Stack>

          {trackingIsPaused && (
            <Alert severity="warning">{t('dashboard.admin.matches.trackingPausedHint')}</Alert>
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
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, px: 2, py: 1.5 }}
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
            <Alert severity="warning">{t('dashboard.admin.matches.timelineClosedHint')}</Alert>
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
            <Alert severity="info">{t('dashboard.admin.matches.quickTrackingDisabledHint')}</Alert>
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
            <ManualEventForm
              show={showManualEvent}
              onToggle={() => setShowManualEvent((previous) => !previous)}
              matchEventDraft={matchEventDraft}
              onMatchEventDraftField={onMatchEventDraftField}
              handleCreateMatchEvent={handleCreateMatchEvent}
              primaryEventPlayers={primaryEventPlayers}
              relatedEventPlayers={relatedEventPlayers}
              loading={loading}
              matchStatsLoading={matchStatsLoading}
              t={t}
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
