import { Box, Button, Card, CardContent, Stack, Tooltip, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'

const playerName = (p) => p.nickname || `${p.name} ${p.surname1}`
const played = (p) => p.played ?? p.wins + p.draws + p.losses

export default function PlayerRankingCard({ standings = [], t, onStandings }) {
  const theme = useTheme()
  const top5 = [...standings].sort((a, b) => b.points - a.points).slice(0, 5)
  return (
    <Card sx={{ height: '100%', backgroundColor: '#41312A' }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" sx={{ color: '#C1ACA3' }}>
            {t('dashboard.admin.overview.rankingTitle')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('dashboard.admin.overview.rankingTop', { n: 5 })}
          </Typography>
        </Stack>
        <Stack spacing={0.75} sx={{ mt: 1.5 }}>
          {top5.map((p, i) => (
            <Tooltip
              key={p.player_guid}
              title={t('dashboard.admin.overview.rankingLineItem', {
                played: played(p),
                wins: p.wins,
                draws: p.draws,
                points: p.points,
              })}
              placement="left"
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  px: 1,
                  py: 0.75,
                  borderRadius: 1,
                  '&:hover': { background: alpha(theme.palette.secondary.main, 0.08) },
                }}
              >
                <Typography variant="body2">
                  {i + 1}. {playerName(p)}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#DF9F80' }}>
                  {t('dashboard.admin.overview.rankingLineItem', {
                    played: played(p),
                    wins: p.wins,
                    draws: p.draws,
                    points: p.points,
                  })}
                </Typography>
              </Box>
            </Tooltip>
          ))}
        </Stack>
        <Button variant="text" size="small" onClick={onStandings} sx={{ mt: 1 }}>
          {t('dashboard.admin.overview.qaStandingsTitle')}
        </Button>
      </CardContent>
    </Card>
  )
}
