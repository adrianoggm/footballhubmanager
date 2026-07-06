import { useMemo, useState } from 'react'
import { Box, Card, CardContent, IconButton, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'

const playerName = (p) => p.nickname || `${p.name} ${p.surname1}`
const played = (p) => p.played ?? p.wins + p.draws + p.losses

export default function StatCarousel({ standings = [], matches = [], t }) {
  const theme = useTheme()
  const accent = theme.palette.secondary.main
  const [index, setIndex] = useState(0)

  const classificationData = useMemo(
    () =>
      [...standings]
        .sort((a, b) => b.points - a.points)
        .slice(0, 8)
        .map((p) => ({ name: playerName(p), points: p.points })),
    [standings]
  )
  const goalsByMatchday = useMemo(
    () =>
      [...matches]
        .sort((a, b) => new Date(a.match_date) - new Date(b.match_date))
        .map((m, i) => ({
          md: t('dashboard.admin.overview.matchdayShort', { n: i + 1 }),
          goals: (m.home_score ?? 0) + (m.away_score ?? 0),
        })),
    [matches, t]
  )
  const playersVsWins = useMemo(
    () => standings.map((p) => ({ x: played(p), y: p.wins, z: p.points })),
    [standings]
  )

  const views = [
    { key: 'statClassification', chart: 'bar-classification' },
    { key: 'statGoalsByMatchday', chart: 'bar-goals' },
    { key: 'statPlayersVsWins', chart: 'scatter' },
  ]
  const view = views[index]
  const go = (delta) => setIndex((i) => (i + delta + views.length) % views.length)

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Typography variant="h6">{t(`dashboard.admin.overview.${view.key}`)}</Typography>
          <Stack direction="row" spacing={0.5}>
            <IconButton
              size="small"
              onClick={() => go(-1)}
              aria-label={t('dashboard.admin.overview.carouselPrev')}
            >
              ‹
            </IconButton>
            <IconButton
              size="small"
              onClick={() => go(1)}
              aria-label={t('dashboard.admin.overview.carouselNext')}
            >
              ›
            </IconButton>
          </Stack>
        </Stack>
        <Box sx={{ height: 240, mt: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            {view.chart === 'bar-classification' ? (
              <BarChart data={classificationData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-25}
                  height={50}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip />
                <Bar dataKey="points" fill={accent} radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : view.chart === 'bar-goals' ? (
              <BarChart data={goalsByMatchday}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="md" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip />
                <Bar dataKey="goals" fill={accent} radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={t('dashboard.admin.overview.axisPlayed')}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={t('dashboard.admin.overview.axisWins')}
                  tick={{ fontSize: 11 }}
                />
                <ZAxis type="number" dataKey="z" range={[40, 200]} />
                <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={playersVsWins} fill={accent} />
              </ScatterChart>
            )}
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  )
}
