import {
  Button,
  Card,
  CardContent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'

/**
 * Read-only season match list with a detail action.
 * Extracted from the UserDashboard monolith.
 */
export default function UserMatchesSection({
  anchorId,
  orderedSeasonMatches,
  matchDetailLoading,
  onOpenMatchDetail,
  t,
  formatDate,
}) {
  return (
    <Card id={anchorId} data-sitemap-anchor>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="h6">{t('dashboard.user.matchesTitle')}</Typography>
          {!orderedSeasonMatches.length && (
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.user.noMatchesForSeason')}
            </Typography>
          )}
          {orderedSeasonMatches.length > 0 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('dashboard.user.table.date')}</TableCell>
                    <TableCell>{t('dashboard.user.table.home')}</TableCell>
                    <TableCell>{t('dashboard.user.table.away')}</TableCell>
                    <TableCell>{t('dashboard.user.table.status')}</TableCell>
                    <TableCell>{t('dashboard.user.table.result')}</TableCell>
                    <TableCell>{t('dashboard.user.table.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orderedSeasonMatches.map((match) => (
                    <TableRow key={match.guid}>
                      <TableCell>{formatDate(match.match_date)}</TableCell>
                      <TableCell>{match.home_team_name}</TableCell>
                      <TableCell>{match.away_team_name}</TableCell>
                      <TableCell>
                        {String(match.status || '').toLowerCase() === 'closed'
                          ? t('dashboard.user.statusClosed')
                          : t('dashboard.user.statusOpen')}
                      </TableCell>
                      <TableCell>
                        {match.home_score} - {match.away_score}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => onOpenMatchDetail(match.guid)}
                          disabled={matchDetailLoading}
                        >
                          {t('dashboard.common.matchDetail.viewAction')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
