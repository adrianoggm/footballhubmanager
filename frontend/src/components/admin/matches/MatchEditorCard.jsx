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
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { translatePositionLabel } from '../../../i18n/labels.js'
import MatchLineupsTab from './MatchLineupsTab.jsx'
import MatchStatsTab from './MatchStatsTab.jsx'
import MatchTrackingTab from './MatchTrackingTab.jsx'
import { useGoalkeeperAlarm } from './useGoalkeeperAlarm.js'
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

const QUICK_TRACKING_EVENT_TYPES = ['goal', 'assist', 'save', 'yellow_card', 'red_card']

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

  // Keep the editable field in sync with the persisted value (after save / when
  // switching matches), without clobbering edits to an unrelated field.
  useEffect(() => {
    setRotationMinutesInput(String(Math.round(goalkeeperRotationSeconds / 60)))
  }, [goalkeeperRotationSeconds, selectedMatchDetail?.guid])

  const { rotationAlarmActive, rotationAlarmCycle, dismissRotationAlarm } = useGoalkeeperAlarm({
    trackingIsLive,
    goalkeeperRotationSeconds,
    displayedElapsed,
    matchGuid: selectedMatchDetail?.guid,
  })

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
            <MatchTrackingTab
              selectedMatchDetail={selectedMatchDetail}
              selectedTrackedScore={selectedTrackedScore}
              selectedMatchEvents={selectedMatchEvents}
              trackingIsLive={trackingIsLive}
              trackingIsPaused={trackingIsPaused}
              officiallyClosed={officiallyClosed}
              timelineLocked={timelineLocked}
              hasLineupAudit={hasLineupAudit}
              clockColorKey={clockColorKey}
              displayedElapsed={displayedElapsed}
              formatElapsedDuration={formatElapsedDuration}
              handleStartMatch={handleStartMatch}
              handleResumeMatch={handleResumeMatch}
              handlePauseMatch={handlePauseMatch}
              handleStopMatch={handleStopMatch}
              loading={loading}
              matchStatsLoading={matchStatsLoading}
              rotationAlarmActive={rotationAlarmActive}
              rotationAlarmCycle={rotationAlarmCycle}
              dismissRotationAlarm={dismissRotationAlarm}
              rotationMinutesInput={rotationMinutesInput}
              setRotationMinutesInput={setRotationMinutesInput}
              handleApplyRotation={handleApplyRotation}
              rotationDirty={rotationDirty}
              goalkeeperRotationEnabled={goalkeeperRotationEnabled}
              secondsToNextRotation={secondsToNextRotation}
              quickTrackingEnabled={quickTrackingEnabled}
              eventCountsByPlayer={eventCountsByPlayer}
              handleQuickAdjust={handleQuickAdjust}
              formatPlayerDisplayName={formatPlayerDisplayName}
              showManualEvent={showManualEvent}
              setShowManualEvent={setShowManualEvent}
              matchEventDraft={matchEventDraft}
              onMatchEventDraftField={onMatchEventDraftField}
              handleCreateMatchEvent={handleCreateMatchEvent}
              primaryEventPlayers={primaryEventPlayers}
              relatedEventPlayers={relatedEventPlayers}
              t={t}
            />
          )}

          {editorTab === 'lineups' && (
            <MatchLineupsTab
              selectedMatchDetail={selectedMatchDetail}
              hasLineupAudit={hasLineupAudit}
              matchEditorLineupPlayers={matchEditorLineupPlayers}
              matchDraftHomeGuids={matchDraftHomeGuids}
              matchDraftAwayGuids={matchDraftAwayGuids}
              onMatchLineupsDraftChange={onMatchLineupsDraftChange}
              handleSaveMatchLineups={handleSaveMatchLineups}
              loading={loading}
              matchStatsLoading={matchStatsLoading}
              t={t}
            />
          )}

          {editorTab === 'stats' && (
            <MatchStatsTab
              selectedMatchDetail={selectedMatchDetail}
              officiallyClosed={officiallyClosed}
              trackingFinished={trackingFinished}
              officialScoreLabel={officialScoreLabel}
              matchStatsDraft={matchStatsDraft}
              onMatchStatsDraftField={onMatchStatsDraftField}
              formatPlayerDisplayName={formatPlayerDisplayName}
              handleSaveMatchStats={handleSaveMatchStats}
              loading={loading}
              matchStatsLoading={matchStatsLoading}
              t={t}
            />
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
