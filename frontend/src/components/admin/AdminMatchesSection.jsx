import { Card, CardContent, Grid, LinearProgress, Stack } from '@mui/material'
import { useMemo, useState } from 'react'
import MatchCreateCard from './matches/MatchCreateCard.jsx'
import MatchEditorCard from './matches/MatchEditorCard.jsx'
import MatchListCard from './matches/MatchListCard.jsx'
import { buildTrackedTeamScore } from './matches/trackingHelpers.js'

// MT-06: which card shows the (page-level) action error inline. The last
// triggered action owns it; actions not listed here clear the scope so a later
// unrelated error is never attached to a stale card.
const ACTION_ERROR_SCOPES = {
  handleCreateDetailedMatch: 'create',
  handleSaveMatchStats: 'stats',
  handleSaveMatchLineups: 'lineups',
  handleStartMatch: 'tracking',
  handleStopMatch: 'tracking',
  handlePauseMatch: 'tracking',
  handleResumeMatch: 'tracking',
  handleSetGoalkeeperRotation: 'tracking',
  handleQuickMatchEvent: 'tracking',
  handleCreateMatchEvent: 'tracking',
  handleDeleteMatchEvent: 'tracking',
}

/**
 * Matches section, composed of three focused surfaces under `./matches/`:
 *  - MatchCreateCard: create a detailed match (date, teams, drag&drop lineups)
 *  - MatchListCard: season matches table (status, tracking, result, actions)
 *  - MatchEditorCard: live tracking + manual events + lineups + stats report
 * All data state lives in AdminDashboard and flows through the
 * state/actions/helpers bundles; this component only composes.
 */
export default function AdminMatchesSection({ state, actions: rawActions, helpers }) {
  const { t, formatDate, formatElapsedDuration } = helpers
  const [errorScope, setErrorScope] = useState(null)
  const actions = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(rawActions).map(([name, action]) =>
          name.startsWith('handle') && typeof action === 'function'
            ? [
                name,
                (...args) => {
                  setErrorScope(ACTION_ERROR_SCOPES[name] || null)
                  return action(...args)
                },
              ]
            : [name, action]
        )
      ),
    [rawActions]
  )
  const scopedError = (scope) => (errorScope === scope ? state.actionError || '' : '')
  const {
    selectedSeasonGuid,
    seasonMatchesLoading,
    visibleSeasonMatches,
    selectedMatchGuid,
    deletingMatchGuid,
    matchStatsLoading,
    selectedMatchDetail,
    matchLineupsDraft,
    matchStatsDraft,
  } = state
  const { handleOpenMatchStats, handleRequestDeleteSeasonMatch } = actions

  const selectedTrackedScore = buildTrackedTeamScore(selectedMatchDetail)
  const editorReady = Boolean(
    selectedSeasonGuid &&
    !matchStatsLoading &&
    selectedMatchDetail &&
    matchLineupsDraft &&
    matchStatsDraft
  )

  return (
    <Grid container spacing={2.5}>
      <Grid item xs={12}>
        <MatchCreateCard
          state={state}
          actions={actions}
          helpers={helpers}
          inlineError={scopedError('create')}
        />
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <MatchListCard
                selectedSeasonGuid={selectedSeasonGuid}
                seasonMatchesLoading={seasonMatchesLoading}
                visibleSeasonMatches={visibleSeasonMatches}
                selectedMatchGuid={selectedMatchGuid}
                selectedTrackedScore={selectedTrackedScore}
                deletingMatchGuid={deletingMatchGuid}
                matchStatsLoading={matchStatsLoading}
                onManageMatch={handleOpenMatchStats}
                onRequestDeleteMatch={handleRequestDeleteSeasonMatch}
                t={t}
                formatDate={formatDate}
                formatElapsedDuration={formatElapsedDuration}
              />

              {selectedSeasonGuid && matchStatsLoading && <LinearProgress />}
              {editorReady && (
                <MatchEditorCard
                  state={state}
                  actions={actions}
                  helpers={helpers}
                  inlineErrors={{
                    stats: scopedError('stats'),
                    lineups: scopedError('lineups'),
                    tracking: scopedError('tracking'),
                  }}
                />
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
