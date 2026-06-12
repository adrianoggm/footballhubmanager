import {
  Button,
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
import { trackingChipColor, trackingLabel } from './trackingHelpers.js'

/**
 * Season matches table (status, tracking, result, manage/delete actions).
 * Extracted from AdminMatchesSection; the header card and the match editor
 * remain owned by the section, which renders this list inside its card.
 */
export default function MatchListCard({
  selectedSeasonGuid,
  seasonMatchesLoading,
  visibleSeasonMatches,
  selectedMatchGuid,
  selectedTrackedScore,
  deletingMatchGuid,
  matchStatsLoading,
  onManageMatch,
  onRequestDeleteMatch,
  t,
  formatDate,
  formatElapsedDuration,
}) {
  return (
    <Stack spacing={2}>
      <Typography variant="h6">{t('dashboard.admin.matches.seasonMatchesTitle')}</Typography>
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
                <TableCell>{t('dashboard.admin.matches.tracking')}</TableCell>
                <TableCell>{t('dashboard.admin.matches.result')}</TableCell>
                <TableCell>{t('dashboard.admin.matches.resultSource')}</TableCell>
                <TableCell>{t('dashboard.admin.matches.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleSeasonMatches.map((match) => {
                const status = String(match.status || 'open').toLowerCase()
                const isClosed = status === 'closed'
                const trackedScore = selectedMatchGuid === match.guid ? selectedTrackedScore : null

                return (
                  <TableRow key={match.guid}>
                    <TableCell>{formatDate(match.match_date)}</TableCell>
                    <TableCell>{match.home_team_name}</TableCell>
                    <TableCell>{match.away_team_name}</TableCell>
                    <TableCell>
                      <Stack spacing={0.75}>
                        <Chip
                          size="small"
                          color={isClosed ? 'success' : 'warning'}
                          label={
                            isClosed
                              ? t('dashboard.admin.matches.statusClosed')
                              : t('dashboard.admin.matches.statusOpen')
                          }
                        />
                        {Number(match.lineup_change_count || 0) > 0 ? (
                          <Chip
                            size="small"
                            variant="outlined"
                            label={t('dashboard.admin.matches.lineupAuditBadge', {
                              count: match.lineup_change_count,
                            })}
                          />
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.75}>
                        <Chip
                          size="small"
                          color={trackingChipColor(match.tracking_status)}
                          label={trackingLabel(match.tracking_status, t)}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatElapsedDuration(match.elapsed_seconds)}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {trackedScore?.home ?? match.home_score ?? 0} -{' '}
                      {trackedScore?.away ?? match.away_score ?? 0}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {trackedScore && status !== 'closed'
                          ? t('dashboard.admin.matches.scoreFromTracking')
                          : t('dashboard.admin.matches.scoreFromStats')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button
                          variant={selectedMatchGuid === match.guid ? 'contained' : 'text'}
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation()
                            onManageMatch(match.guid)
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
                            onRequestDeleteMatch(match)
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
    </Stack>
  )
}
