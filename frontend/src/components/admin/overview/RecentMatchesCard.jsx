import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material'
import { EmptyState } from '../../common'

export default function RecentMatchesCard({ matches = [], t, formatDate, onOpenMatchDetail }) {
  const recent = [...matches]
    .sort((a, b) => new Date(b.match_date) - new Date(a.match_date))
    .slice(0, 3)
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">{t('dashboard.admin.overview.recentMatchesTitle')}</Typography>
          <Typography variant="caption" color="text.secondary">
            {t('dashboard.admin.overview.recentMatchesLast', { n: 3 })}
          </Typography>
        </Stack>
        {recent.length ? (
          <Stack spacing={0.75} sx={{ mt: 1.5 }}>
            {recent.map((m) => (
              <Box
                key={m.guid}
                onClick={() => onOpenMatchDetail(m.guid)}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  px: 1,
                  py: 0.75,
                  borderRadius: 1,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                <Typography variant="body2" sx={{ minWidth: 0 }}>
                  {formatDate(m.match_date)} · {m.home_team_name} vs {m.away_team_name}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {m.home_score} - {m.away_score}
                </Typography>
              </Box>
            ))}
          </Stack>
        ) : (
          <EmptyState title={t('dashboard.admin.overview.noUpcomingMatch')} dense />
        )}
      </CardContent>
    </Card>
  )
}
