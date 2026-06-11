import {
  Alert,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import LineupDragBuilder from '../../LineupDragBuilder.jsx'

/**
 * "Create detailed match" card: date + team names + drag-and-drop lineups.
 * Extracted from AdminMatchesSection; state stays in the dashboard and arrives
 * through the same state/actions/helpers bundles.
 */
export default function MatchCreateCard({ state, actions, helpers }) {
  const {
    selectedSeasonGuid,
    seasonRosterLoading,
    seasonRoster,
    createMatchLineupPlayers,
    matchFormHomeGuids,
    matchFormAwayGuids,
    matchForm,
    loading,
    lastCreatedMatch,
  } = state
  const { onMatchField, onMatchFormLineupsChange, handleCreateDetailedMatch } = actions
  const { t, formatDate } = helpers

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6">{t('dashboard.admin.matches.title')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.admin.matches.description')}
          </Typography>
          <TextField
            type="date"
            label={t('dashboard.admin.matches.matchDate')}
            InputLabelProps={{ shrink: true }}
            value={matchForm.match_date}
            onChange={onMatchField('match_date')}
            disabled={!selectedSeasonGuid}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              label={t('dashboard.admin.matches.homeTeam')}
              value={matchForm.home_team_name}
              onChange={onMatchField('home_team_name')}
              placeholder={t('dashboard.admin.matches.homeTeamPlaceholder')}
              disabled={!selectedSeasonGuid}
              fullWidth
            />
            <TextField
              label={t('dashboard.admin.matches.awayTeam')}
              value={matchForm.away_team_name}
              onChange={onMatchField('away_team_name')}
              placeholder={t('dashboard.admin.matches.awayTeamPlaceholder')}
              disabled={!selectedSeasonGuid}
              fullWidth
            />
          </Stack>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {t('dashboard.admin.matches.lineupHelperTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.admin.matches.lineupHelperDescription')}
          </Typography>
          {!selectedSeasonGuid && (
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.admin.matches.lineupHelperSelectSeason')}
            </Typography>
          )}
          {selectedSeasonGuid && seasonRosterLoading && <LinearProgress />}
          {selectedSeasonGuid && !seasonRosterLoading && !seasonRoster.length && (
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.admin.matches.noPlayersAvailable')}
            </Typography>
          )}
          {selectedSeasonGuid && !seasonRosterLoading && seasonRoster.length > 0 && (
            <LineupDragBuilder
              players={createMatchLineupPlayers}
              homeGuids={matchFormHomeGuids}
              awayGuids={matchFormAwayGuids}
              onChange={onMatchFormLineupsChange}
              availableTitle={t('dashboard.admin.matches.availablePlayers')}
              homeTitle={matchForm.home_team_name || t('dashboard.admin.matches.homeLineup')}
              awayTitle={matchForm.away_team_name || t('dashboard.admin.matches.awayLineup')}
              helperText={t('dashboard.admin.matches.lineupBoardHint')}
              emptyText={t('dashboard.admin.matches.lineupEmpty')}
              addHomeText={t('dashboard.admin.matches.addToHome')}
              addAwayText={t('dashboard.admin.matches.addToAway')}
              moveHomeText={t('dashboard.admin.matches.moveToHome')}
              moveAwayText={t('dashboard.admin.matches.moveToAway')}
              removeText={t('dashboard.admin.matches.removeFromLineup')}
              disabled={loading || !selectedSeasonGuid}
            />
          )}
          <Button
            variant="contained"
            onClick={handleCreateDetailedMatch}
            disabled={loading || !selectedSeasonGuid}
          >
            {t('dashboard.admin.matches.createDetailedMatch')}
          </Button>
          {lastCreatedMatch && (
            <Alert severity="success">
              {t('dashboard.admin.matches.matchCreated', {
                guid: lastCreatedMatch.guid,
                date: formatDate(lastCreatedMatch.match_date),
              })}
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
