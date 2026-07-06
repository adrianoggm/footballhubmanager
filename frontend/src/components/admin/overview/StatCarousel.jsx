import { useMemo, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { EmptyState } from '../../common'

const playerName = (p) => p.nickname || `${p.name} ${p.surname1}`
const played = (p) => p.played ?? p.wins + p.draws + p.losses

// Each view is a DELIBERATELY different element type (table, area, scatter) so the
// carousel reads as distinct stats, not the same chart three times.
const VIEWS = [
  { key: 'statClassification', kind: 'table' },
  { key: 'statGoalsByMatchday', kind: 'area' },
  { key: 'statPlayersVsWins', kind: 'scatter' },
]

function ClassificationTable({ standings, t }) {
  const rows = useMemo(
    () => [...standings].sort((a, b) => b.points - a.points).slice(0, 8),
    [standings]
  )
  if (!rows.length) return <EmptyState title={t('dashboard.admin.overview.noSeasonShort')} dense />
  return (
    <Box sx={{ height: 240, overflowY: 'auto' }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 28 }}>#</TableCell>
            <TableCell>{t('dashboard.admin.table.player')}</TableCell>
            <TableCell align="right">{t('dashboard.admin.table.played')}</TableCell>
            <TableCell align="right">{t('dashboard.admin.table.w')}</TableCell>
            <TableCell align="right">{t('dashboard.admin.table.d')}</TableCell>
            <TableCell align="right">{t('dashboard.admin.table.l')}</TableCell>
            <TableCell align="right">{t('dashboard.admin.table.pts')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((p, i) => (
            <TableRow key={p.player_guid}>
              <TableCell sx={{ color: 'text.secondary' }}>{i + 1}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{playerName(p)}</TableCell>
              <TableCell align="right">{played(p)}</TableCell>
              <TableCell align="right">{p.wins}</TableCell>
              <TableCell align="right">{p.draws}</TableCell>
              <TableCell align="right">{p.losses}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: 'secondary.main' }}>
                {p.points}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  )
}

export default function StatCarousel({ standings = [], allMatches = [], t }) {
  const theme = useTheme()
  const accent = theme.palette.secondary.main
  const [index, setIndex] = useState(0)

  const goalsByMatchday = useMemo(
    () =>
      [...allMatches]
        .sort((a, b) => new Date(a.match_date) - new Date(b.match_date))
        .map((m, i) => ({
          md: t('dashboard.admin.overview.matchdayShort', { n: i + 1 }),
          goals: (m.home_score ?? 0) + (m.away_score ?? 0),
        })),
    [allMatches, t]
  )
  const playersVsWins = useMemo(
    () => standings.map((p) => ({ x: played(p), y: p.wins, z: p.points, name: playerName(p) })),
    [standings]
  )

  const view = VIEWS[index]
  const go = (delta) => setIndex((i) => (i + delta + VIEWS.length) % VIEWS.length)

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6">{t(`dashboard.admin.overview.${view.key}`)}</Typography>
            <Stack direction="row" spacing={0.5}>
              {VIEWS.map((v, i) => (
                <Box
                  key={v.key}
                  sx={{
                    width: i === index ? 16 : 6,
                    height: 6,
                    borderRadius: 3,
                    bgcolor: i === index ? accent : alpha(theme.palette.text.primary, 0.2),
                    transition: 'width 160ms ease, background 160ms ease',
                  }}
                />
              ))}
            </Stack>
          </Stack>
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

        <Box sx={{ mt: 1 }}>
          {view.kind === 'table' ? (
            <ClassificationTable standings={standings} t={t} />
          ) : (
            <Box sx={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                {view.kind === 'area' ? (
                  <AreaChart data={goalsByMatchday}>
                    <defs>
                      <linearGradient id="goalsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={accent} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="md" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <RechartsTooltip />
                    <Area
                      type="monotone"
                      dataKey="goals"
                      stroke={accent}
                      strokeWidth={2}
                      fill="url(#goalsFill)"
                    />
                  </AreaChart>
                ) : (
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name={t('dashboard.admin.overview.axisPlayed')}
                      tick={{ fontSize: 11 }}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name={t('dashboard.admin.overview.axisWins')}
                      tick={{ fontSize: 11 }}
                      allowDecimals={false}
                    />
                    <ZAxis type="number" dataKey="z" range={[60, 300]} />
                    <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter data={playersVsWins} fill={accent} />
                  </ScatterChart>
                )}
              </ResponsiveContainer>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}
