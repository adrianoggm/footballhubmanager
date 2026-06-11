import { Card, CardContent, Grid, LinearProgress, Stack } from '@mui/material'
import MatchCreateCard from './matches/MatchCreateCard.jsx'
import MatchEditorCard from './matches/MatchEditorCard.jsx'
import MatchListCard from './matches/MatchListCard.jsx'
import { buildTrackedTeamScore } from './matches/trackingHelpers.js'

/**
 * Matches section, composed of three focused surfaces under `./matches/`:
 *  - MatchCreateCard: create a detailed match (date, teams, drag&drop lineups)
 *  - MatchListCard: season matches table (status, tracking, result, actions)
 *  - MatchEditorCard: live tracking + manual events + lineups + stats report
 * All data state lives in AdminDashboard and flows through the
 * state/actions/helpers bundles; this component only composes.
 */
export default function AdminMatchesSection({ state, actions, helpers }) {
  const { t, formatDate, formatElapsedDuration } = helpers
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
    <Grid container spacing={2.5} sx={{ width: '100%' }}>
      <Grid item xs={12}>
        <MatchCreateCard state={state} actions={actions} helpers={helpers} />
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
                <MatchEditorCard state={state} actions={actions} helpers={helpers} />
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
