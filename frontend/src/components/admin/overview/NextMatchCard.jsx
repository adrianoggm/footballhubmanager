import { Card, CardContent, Stack, Typography } from '@mui/material'
import { EmptyState } from '../../common'

export default function NextMatchCard({ match, t, formatDate }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {t('dashboard.admin.overview.nextMatchTitle')}
        </Typography>
        {match ? (
          <Stack spacing={0.5} sx={{ mt: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {match.home_team_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.admin.overview.versus')}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {match.away_team_name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {formatDate(match.match_date)}
            </Typography>
          </Stack>
        ) : (
          <EmptyState title={t('dashboard.admin.overview.noUpcomingMatch')} dense />
        )}
      </CardContent>
    </Card>
  )
}
