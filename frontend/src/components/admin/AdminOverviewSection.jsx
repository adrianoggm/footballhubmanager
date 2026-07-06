import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
import { EmptyState } from '../common'
import OverviewDatacards from './overview/OverviewDatacards.jsx'
import QuickActions from './overview/QuickActions.jsx'

/**
 * Admin overview: invite-code generation, standings snapshot, and season-matches
 * snapshot. Extracted from the AdminDashboard monolith. Imported eagerly (not lazy)
 * because overview is the default landing section — keeping it in the main chunk
 * avoids a first-paint Suspense flash.
 *
 * The match-detail dialog itself stays in AdminDashboard; this section only triggers
 * it via `actions.onOpenMatchDetail`.
 */
export default function AdminOverviewSection({ state, actions, helpers }) {
  const {
    loading,
    selectedSeasonGuid,
    tokenPayload,
    standings,
    overviewSeasonMatches,
    overviewMatchesSummary,
    overviewMatchLoading,
    overviewDatacards,
  } = state
  const { onGenerateJoinCode, onRefreshStandings, onCreateMatch, onOpenMatchDetail } = actions
  const { t, formatDate, formatEpochSeconds } = helpers

  return (
    <Grid container spacing={2.5} sx={{ width: '100%' }}>
      <Grid item xs={12}>
        <OverviewDatacards cards={overviewDatacards} />
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">
                {t('dashboard.admin.overview.quickActionsTitle')}
              </Typography>
              <QuickActions actions={actions} t={t} />
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">{t('dashboard.admin.overview.inviteTitle')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('dashboard.admin.overview.inviteDescription')}
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                onClick={onGenerateJoinCode}
                disabled={loading}
              >
                {t('dashboard.admin.overview.generateJoinCode')}
              </Button>
              {tokenPayload && (
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>{t('dashboard.admin.overview.codeLabel')}:</strong> {tokenPayload.token}
                  </Typography>
                  <Typography variant="body2">
                    <strong>{t('dashboard.admin.overview.expiresLabel')}:</strong>{' '}
                    {formatEpochSeconds(tokenPayload.expires_at)}
                  </Typography>
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
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ sm: 'center' }}
                justifyContent="space-between"
                spacing={1}
              >
                <Typography variant="h6">
                  {t('dashboard.admin.overview.standingsSnapshotTitle')}
                </Typography>
                <Button
                  variant="text"
                  onClick={onRefreshStandings}
                  disabled={loading || !selectedSeasonGuid}
                >
                  {t('dashboard.admin.overview.refreshStandings')}
                </Button>
              </Stack>
              {!selectedSeasonGuid && (
                <EmptyState title={t('dashboard.admin.overview.selectSeasonToLoad')} dense />
              )}
              {selectedSeasonGuid && (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('dashboard.admin.table.player')}</TableCell>
                        <TableCell align="right">{t('dashboard.admin.table.played')}</TableCell>
                        <TableCell align="right">{t('dashboard.admin.table.w')}</TableCell>
                        <TableCell align="right">{t('dashboard.admin.table.d')}</TableCell>
                        <TableCell align="right">{t('dashboard.admin.table.l')}</TableCell>
                        <TableCell align="right">{t('dashboard.admin.table.goals')}</TableCell>
                        <TableCell align="right">{t('dashboard.admin.table.assists')}</TableCell>
                        <TableCell align="right">{t('dashboard.admin.table.pts')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {standings.slice(0, 5).map((player) => (
                        <TableRow key={player.player_guid}>
                          <TableCell>
                            {player.nickname || `${player.name} ${player.surname1}`}
                          </TableCell>
                          <TableCell align="right">
                            {player.played ?? player.wins + player.draws + player.losses}
                          </TableCell>
                          <TableCell align="right">{player.wins}</TableCell>
                          <TableCell align="right">{player.draws}</TableCell>
                          <TableCell align="right">{player.losses}</TableCell>
                          <TableCell align="right">{player.goals ?? 0}</TableCell>
                          <TableCell align="right">{player.assists ?? 0}</TableCell>
                          <TableCell align="right">{player.points}</TableCell>
                        </TableRow>
                      ))}
                      {!standings.length && (
                        <TableRow>
                          <TableCell colSpan={8}>
                            {t('dashboard.admin.overview.noStandingsForSeason')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ sm: 'center' }}
                justifyContent="space-between"
                spacing={1}
              >
                <Box>
                  <Typography variant="h6">
                    {t('dashboard.admin.overview.seasonMatchesSnapshotTitle')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('dashboard.admin.overview.seasonMatchesSnapshotDescription')}
                  </Typography>
                </Box>
                <Button variant="text" onClick={onCreateMatch}>
                  {t('dashboard.admin.overview.createMatch')}
                </Button>
              </Stack>

              {!selectedSeasonGuid && (
                <EmptyState title={t('dashboard.admin.overview.selectSeasonToLoad')} dense />
              )}

              {selectedSeasonGuid && (
                <>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    <Chip
                      size="small"
                      color="primary"
                      label={t('dashboard.admin.overview.totalMatchesChip', {
                        total: overviewMatchesSummary.total,
                      })}
                    />
                    <Chip
                      size="small"
                      color="warning"
                      label={t('dashboard.admin.overview.openMatchesChip', {
                        open: overviewMatchesSummary.open,
                      })}
                    />
                    <Chip
                      size="small"
                      color="success"
                      label={t('dashboard.admin.overview.closedMatchesChip', {
                        closed: overviewMatchesSummary.closed,
                      })}
                    />
                  </Stack>

                  {!overviewSeasonMatches.length && (
                    <EmptyState title={t('dashboard.admin.overview.noMatchesForSeason')} dense />
                  )}

                  {overviewSeasonMatches.length > 0 && (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>{t('dashboard.admin.matches.date')}</TableCell>
                            <TableCell>{t('dashboard.admin.matches.home')}</TableCell>
                            <TableCell>{t('dashboard.admin.matches.away')}</TableCell>
                            <TableCell>{t('dashboard.admin.matches.status')}</TableCell>
                            <TableCell>{t('dashboard.admin.matches.result')}</TableCell>
                            <TableCell>{t('dashboard.admin.matches.actions')}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {overviewSeasonMatches.map((match) => {
                            const isClosed = String(match.status || '').toLowerCase() === 'closed'
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
                                  <Button
                                    size="small"
                                    variant="text"
                                    onClick={() => onOpenMatchDetail(match.guid)}
                                    disabled={overviewMatchLoading}
                                  >
                                    {t('dashboard.common.matchDetail.viewAction')}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
