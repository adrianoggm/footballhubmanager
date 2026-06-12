import {
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { translatePositionLabel, translateRoleLabel } from '../../i18n/labels.js'
import { DEFAULT_LABEL_COLOR } from '../../theme/tokens.js'

const labelChipSx = (color) => ({
  backgroundColor: color || DEFAULT_LABEL_COLOR,
  color: '#fff',
})

/**
 * Read-only season standings with the current player's row highlighted and a
 * "you" summary chip row. Extracted from the UserDashboard monolith.
 */
export default function UserStandingsSection({
  anchorId,
  seasonDataLoading,
  standings,
  currentStanding,
  currentPlayerGuid,
  t,
}) {
  return (
    <Card id={anchorId} data-sitemap-anchor>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="h6">{t('dashboard.user.standingsTitle')}</Typography>
          {seasonDataLoading && <LinearProgress />}
          {!seasonDataLoading && !standings.length && (
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.user.noStandingsForSeason')}
            </Typography>
          )}
          {!seasonDataLoading && standings.length > 0 && (
            <Stack spacing={1.5}>
              {currentStanding && (
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  <Chip size="small" color="info" label={t('dashboard.user.youTag')} />
                  <Chip
                    size="small"
                    color="secondary"
                    label={t('dashboard.user.yourRank', { rank: currentStanding.rank })}
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={t('dashboard.user.yourPositionLabel', {
                      position: currentStanding.position || '-',
                    })}
                  />
                  {currentStanding.role && (
                    <Chip
                      size="small"
                      label={translateRoleLabel(t, currentStanding.role)}
                      sx={labelChipSx(currentStanding.role_color)}
                    />
                  )}
                  <Chip
                    size="small"
                    variant="outlined"
                    label={t('dashboard.user.yourPointsLabel', { points: currentStanding.points })}
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={t('dashboard.user.yourGoalContributionLabel', {
                      goals: currentStanding.goals ?? 0,
                      assists: currentStanding.assists ?? 0,
                    })}
                  />
                </Stack>
              )}
              {!currentStanding && currentPlayerGuid && (
                <Typography variant="caption" color="text.secondary">
                  {t('dashboard.user.notInStandingsYet')}
                </Typography>
              )}
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('dashboard.user.table.rank')}</TableCell>
                      <TableCell>{t('dashboard.user.table.player')}</TableCell>
                      <TableCell>{t('dashboard.user.table.role')}</TableCell>
                      <TableCell>{t('dashboard.user.table.position')}</TableCell>
                      <TableCell align="right">{t('dashboard.user.table.played')}</TableCell>
                      <TableCell align="right">{t('dashboard.user.table.w')}</TableCell>
                      <TableCell align="right">{t('dashboard.user.table.d')}</TableCell>
                      <TableCell align="right">{t('dashboard.user.table.l')}</TableCell>
                      <TableCell align="right">{t('dashboard.user.table.goals')}</TableCell>
                      <TableCell align="right">{t('dashboard.user.table.assists')}</TableCell>
                      <TableCell align="right">{t('dashboard.user.table.pts')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {standings.map((player, index) => {
                      const isCurrentPlayer = player.player_guid === currentPlayerGuid
                      return (
                        <TableRow
                          key={player.player_guid}
                          sx={
                            isCurrentPlayer
                              ? {
                                  '& td': {
                                    backgroundColor: 'rgba(2, 136, 209, 0.09)',
                                    fontWeight: 700,
                                  },
                                }
                              : undefined
                          }
                        >
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <span>{player.nickname || `${player.name} ${player.surname1}`}</span>
                              {isCurrentPlayer && (
                                <Chip
                                  size="small"
                                  color="info"
                                  variant="filled"
                                  label={t('dashboard.user.youTag')}
                                />
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            {player.role ? (
                              <Chip
                                size="small"
                                label={translateRoleLabel(t, player.role)}
                                sx={labelChipSx(player.role_color)}
                              />
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {player.position ? (
                              <Chip
                                size="small"
                                label={translatePositionLabel(t, player.position)}
                                sx={labelChipSx(player.position_color)}
                              />
                            ) : (
                              '-'
                            )}
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
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
