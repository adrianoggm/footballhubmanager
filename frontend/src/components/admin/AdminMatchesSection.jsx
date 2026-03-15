import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import LineupDragBuilder from '../LineupDragBuilder.jsx'
import MatchDetailViewer from '../MatchDetailViewer.jsx'

export default function AdminMatchesSection({ state, actions, helpers }) {
  const { t, formatDate, formatPlayerDisplayName } = helpers
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
    seasonMatchesLoading,
    visibleSeasonMatches,
    selectedMatchGuid,
    deletingMatchGuid,
    matchStatsLoading,
    selectedMatchDetail,
    matchLineupsDraft,
    matchStatsDraft,
    matchEditorLineupPlayers,
    matchDraftHomeGuids,
    matchDraftAwayGuids,
  } = state
  const {
    onMatchField,
    onMatchFormLineupsChange,
    handleCreateDetailedMatch,
    handleOpenMatchStats,
    handleRequestDeleteSeasonMatch,
    onMatchLineupsDraftChange,
    handleSaveMatchLineups,
    onMatchStatsDraftField,
    handleSaveMatchStats,
    closeMatchEditor,
  } = actions

  return (
    <Grid container spacing={2.5}>
      <Grid item xs={12}>
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
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">
                {t('dashboard.admin.matches.seasonMatchesTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('dashboard.admin.matches.seasonMatchesDescription')}
              </Typography>
              {seasonMatchesLoading && <LinearProgress />}
              {!selectedSeasonGuid && (
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.admin.overview.selectSeasonToLoad')}
                </Typography>
              )}
              {selectedSeasonGuid && !seasonMatchesLoading && !visibleSeasonMatches.length && (
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.admin.matches.noMatchesYet')}
                </Typography>
              )}
              {selectedSeasonGuid && !seasonMatchesLoading && visibleSeasonMatches.length > 0 && (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('dashboard.admin.matches.date')}</TableCell>
                        <TableCell>{t('dashboard.admin.matches.home')}</TableCell>
                        <TableCell>{t('dashboard.admin.matches.away')}</TableCell>
                        <TableCell>{t('dashboard.admin.matches.status')}</TableCell>
                        <TableCell>{t('dashboard.admin.matches.result')}</TableCell>
                        <TableCell>{t('dashboard.admin.matches.resultSource')}</TableCell>
                        <TableCell>{t('dashboard.admin.matches.actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {visibleSeasonMatches.map((match) => {
                        const status = String(match.status || 'open').toLowerCase()
                        const isClosed = status === 'closed'

                        return (
                          <TableRow key={match.guid}>
                            <TableCell>{formatDate(match.match_date)}</TableCell>
                            <TableCell>{match.home_team_name}</TableCell>
                            <TableCell>{match.away_team_name}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                color={isClosed ? 'success' : 'warning'}
                                label={
                                  isClosed
                                    ? t('dashboard.admin.matches.statusClosed')
                                    : t('dashboard.admin.matches.statusOpen')
                                }
                              />
                            </TableCell>
                            <TableCell>
                              {match.home_score} - {match.away_score}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {t('dashboard.admin.matches.scoreFromStats')}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Button
                                  variant={selectedMatchGuid === match.guid ? 'contained' : 'text'}
                                  size="small"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    handleOpenMatchStats(match.guid)
                                  }}
                                  disabled={matchStatsLoading || deletingMatchGuid === match.guid}
                                >
                                  {t('dashboard.admin.matches.manageMatch')}
                                </Button>
                                <Button
                                  variant="text"
                                  color="error"
                                  size="small"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    handleRequestDeleteSeasonMatch(match)
                                  }}
                                  disabled={deletingMatchGuid === match.guid}
                                >
                                  {t('dashboard.admin.matches.deleteMatch')}
                                </Button>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {selectedSeasonGuid && matchStatsLoading && <LinearProgress />}
              {selectedSeasonGuid &&
                !matchStatsLoading &&
                selectedMatchDetail &&
                matchLineupsDraft &&
                matchStatsDraft && (
                  <Card variant="outlined" sx={{ mt: 1 }}>
                    <CardContent>
                      <Stack spacing={2}>
                        <MatchDetailViewer
                          detail={selectedMatchDetail}
                          t={t}
                          formatDate={formatDate}
                          showSubtitle={false}
                        />

                        <Divider />

                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {t('dashboard.admin.matches.statsEditorTitle', {
                              home: selectedMatchDetail.home_team.team_name,
                              away: selectedMatchDetail.away_team.team_name,
                            })}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {t('dashboard.admin.matches.statsEditorDescription')}
                          </Typography>
                        </Box>

                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          flexWrap="wrap"
                          useFlexGap
                        >
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
                        </Stack>

                        {selectedMatchDetail.status === 'closed' && (
                          <Alert severity="warning">
                            {t('dashboard.admin.matches.lineupsReopenHint')}
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
                                          onChange={onMatchStatsDraftField(
                                            key,
                                            player.player_guid,
                                            'goals'
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
                                          onChange={onMatchStatsDraftField(
                                            key,
                                            player.player_guid,
                                            'saves'
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
                          <Button variant="text" onClick={closeMatchEditor} disabled={loading}>
                            {t('dashboard.admin.matches.closeEditor')}
                          </Button>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
