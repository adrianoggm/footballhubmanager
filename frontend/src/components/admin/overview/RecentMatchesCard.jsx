import { Box, Button, Card, CardContent, Stack, Typography, useTheme } from '@mui/material'
import { EmptyState } from '../../common'

// day + short month from a YYYY-MM-DD string (built as a local date to avoid TZ drift).
function dateParts(value) {
  const [y, m, d] = String(value || '')
    .slice(0, 10)
    .split('-')
  if (!y || !m || !d) return { day: '--', month: '' }
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return {
    day: String(Number(d)),
    month: date.toLocaleString(undefined, { month: 'short' }).toUpperCase(),
  }
}

export default function RecentMatchesCard({ matches = [], t, onOpenMatchDetail, onViewAll }) {
  const theme = useTheme()
  const accent = theme.palette.primary.main
  const isDark = theme.palette.mode === 'dark'
  const recent = matches
    .filter((m) => String(m.status || '').toLowerCase() === 'closed')
    .sort((a, b) => new Date(b.match_date) - new Date(a.match_date))
    .slice(0, 3)

  return (
    <Card sx={{ height: '100%', backgroundColor: theme.palette.background.paper }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" sx={{ color: theme.palette.text.secondary }}>
            {t('dashboard.admin.overview.recentMatchesTitle')}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontFamily: '"IBM Plex Mono", monospace',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: accent,
            }}
          >
            {t('dashboard.admin.overview.recentMatchesLast', { n: 3 })}
          </Typography>
        </Stack>

        {recent.length ? (
          <Stack spacing={1} sx={{ mt: 1.5 }}>
            {recent.map((m) => {
              const { day, month } = dateParts(m.match_date)
              return (
                <Box
                  key={m.guid}
                  onClick={() => onOpenMatchDetail(m.guid)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    cursor: 'pointer',
                    px: 1.5,
                    py: 1.1,
                    borderRadius: '6px',
                    bgcolor: theme.palette.background.default,
                    transition: 'filter 140ms ease',
                    '&:hover': { filter: 'brightness(1.18)' },
                  }}
                >
                  <Stack sx={{ minWidth: 30, textAlign: 'center', lineHeight: 1 }}>
                    <Typography
                      sx={{
                        fontWeight: 800,
                        fontSize: '1rem',
                        color: theme.palette.text.secondary,
                      }}
                    >
                      {day}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        color: theme.palette.text.secondary,
                        fontFamily: '"JetBrains Mono", monospace',
                      }}
                    >
                      {month}
                    </Typography>
                  </Stack>
                  <Typography
                    variant="body2"
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      fontWeight: 600,
                      color: theme.palette.text.secondary,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {m.home_team_name} {t('dashboard.admin.overview.versus')} {m.away_team_name}
                  </Typography>
                  <Typography sx={{ fontWeight: 800, color: accent, whiteSpace: 'nowrap' }}>
                    {m.home_score} - {m.away_score}
                  </Typography>
                </Box>
              )
            })}
            {onViewAll ? (
              <Button
                fullWidth
                onClick={onViewAll}
                sx={{
                  mt: 0.5,
                  color: accent,
                  fontWeight: 700,
                  borderRadius: '6px',
                  bgcolor: theme.palette.background.default,
                  '&:hover': { filter: 'brightness(1.18)' },
                }}
              >
                {t('dashboard.admin.overview.viewFullHistory')}
              </Button>
            ) : null}
          </Stack>
        ) : (
          <EmptyState title={t('dashboard.admin.overview.noRecentMatches')} dense />
        )}
      </CardContent>
    </Card>
  )
}
