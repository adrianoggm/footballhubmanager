import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

const playerName = (p) => p.nickname || `${p.name} ${p.surname1}`
const played = (p) => p.played ?? p.wins + p.draws + p.losses

export default function PlayerRankingCard({ standings = [], t, onStandings }) {
  const { surfaces, tones } = useTheme().custom
  const top5 = [...standings].sort((a, b) => b.points - a.points).slice(0, 5)
  return (
    <Card sx={{ height: '100%', backgroundColor: surfaces.cardAlt }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" sx={{ color: tones.heading }}>
            {t('dashboard.admin.overview.rankingTitle')}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontFamily: '"IBM Plex Mono", monospace',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: tones.accent,
            }}
          >
            {t('dashboard.admin.overview.rankingTop', { n: 5 })}
          </Typography>
        </Stack>
        <Stack spacing={1} sx={{ mt: 1.5 }}>
          {top5.map((p, i) => (
            <Box
              key={p.player_guid}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 1.5,
                py: 1.1,
                borderRadius: '6px',
                bgcolor: surfaces.inset,
              }}
            >
              <Typography sx={{ minWidth: 18, fontWeight: 800, color: tones.subtle }}>
                {i + 1}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  flex: 1,
                  minWidth: 0,
                  fontWeight: 600,
                  color: tones.heading,
                  overflowWrap: 'anywhere',
                }}
              >
                {playerName(p)}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 800, color: tones.accent, whiteSpace: 'nowrap' }}
              >
                {t('dashboard.admin.overview.rankingLineItem', {
                  played: played(p),
                  wins: p.wins,
                  draws: p.draws,
                  points: p.points,
                })}
              </Typography>
            </Box>
          ))}
          <Button
            fullWidth
            onClick={onStandings}
            sx={{
              mt: 0.5,
              color: tones.accent,
              fontWeight: 700,
              borderRadius: '6px',
              bgcolor: surfaces.inset,
              '&:hover': { filter: 'brightness(1.18)' },
            }}
          >
            {t('dashboard.admin.overview.qaStandingsTitle')}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}
