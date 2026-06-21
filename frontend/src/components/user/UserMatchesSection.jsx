import { Button, Card, CardContent, Stack, Typography } from '@mui/material'

import { EmptyState, PaginatedTable, StatusChip } from '../common'

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
  const columns = [
    { key: 'date', label: t('dashboard.user.table.date'), render: (m) => formatDate(m.match_date) },
    { key: 'home', label: t('dashboard.user.table.home'), render: (m) => m.home_team_name },
    { key: 'away', label: t('dashboard.user.table.away'), render: (m) => m.away_team_name },
    {
      key: 'status',
      label: t('dashboard.user.table.status'),
      render: (m) => <StatusChip status={m.status} trackingStatus={m.tracking_status} t={t} />,
    },
    {
      key: 'result',
      label: t('dashboard.user.table.result'),
      render: (m) => `${m.home_score} - ${m.away_score}`,
    },
    {
      key: 'actions',
      label: t('dashboard.user.table.actions'),
      render: (m) => (
        <Button
          size="small"
          variant="text"
          onClick={() => onOpenMatchDetail(m.guid)}
          disabled={matchDetailLoading}
        >
          {t('dashboard.common.matchDetail.viewAction')}
        </Button>
      ),
    },
  ]

  return (
    <Card id={anchorId} data-sitemap-anchor>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="h6">{t('dashboard.user.matchesTitle')}</Typography>
          <PaginatedTable
            columns={columns}
            rows={orderedSeasonMatches}
            getRowKey={(m) => m.guid}
            minWidth={640}
            emptyState={<EmptyState title={t('dashboard.user.noMatchesForSeason')} dense />}
          />
        </Stack>
      </CardContent>
    </Card>
  )
}
