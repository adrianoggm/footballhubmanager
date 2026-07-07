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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { EmptyState } from '../../common'

const ACCENT = '#DF9F80'
const playerName = (p) => p.nickname || `${p.name} ${p.surname1}`
const played = (p) => p.played ?? p.wins + p.draws + p.losses

// Each view is a deliberately different element type.
const VIEWS = [
  { key: 'statClassification', kind: 'table' },
  { key: 'statGoalsByMatchday', kind: 'area' },
  { key: 'statPlayerStats', kind: 'playerStats' },
  { key: 'statWinRate', kind: 'winRate' },
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
              <TableCell align="right" sx={{ color: ACCENT }}>
                {played(p)}
              </TableCell>
              <TableCell align="right" sx={{ color: ACCENT }}>
                {p.wins}
              </TableCell>
              <TableCell align="right" sx={{ color: ACCENT }}>
                {p.draws}
              </TableCell>
              <TableCell align="right" sx={{ color: ACCENT }}>
                {p.losses}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: ACCENT }}>
                {p.points}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  )
}

// Sortable player-stats table with Total <-> Per-match toggle.
function PlayerStatsTable({ standings, t }) {
  const [mode, setMode] = useState('total')
  const [sortKey, setSortKey] = useState('goals')
  const [sortDir, setSortDir] = useState('desc')

  const rows = useMemo(() => {
    const mapped = standings.map((p) => {
      const pj = played(p) || 0
      const per = (v) => (pj ? Math.round((v / pj) * 100) / 100 : 0)
      const avg = mode === 'avg'
      return {
        guid: p.player_guid,
        name: playerName(p),
        played: pj,
        goals: avg ? per(p.goals ?? 0) : (p.goals ?? 0),
        assists: avg ? per(p.assists ?? 0) : (p.assists ?? 0),
        saves: avg ? per(p.saves ?? 0) : (p.saves ?? 0),
        rating: Math.round((p.average_rating ?? 0) * 10) / 10,
      }
    })
    mapped.sort((a, b) => {
      const dir = sortDir === 'desc' ? -1 : 1
      if (sortKey === 'name') return a.name.localeCompare(b.name) * dir
      return (a[sortKey] - b[sortKey]) * dir
    })
    return mapped.slice(0, 8)
  }, [standings, mode, sortKey, sortDir])

  if (!standings.length)
    return <EmptyState title={t('dashboard.admin.overview.noSeasonShort')} dense />

  const onSort = (key) => {
    if (key === sortKey) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else {
      setSortKey(key)
      setSortDir('desc')
    }
  }
  const arrow = (key) => (sortKey === key ? (sortDir === 'desc' ? ' ↓' : ' ↑') : '')
  const cols = [
    { key: 'name', label: t('dashboard.admin.table.player'), align: 'left' },
    { key: 'goals', label: t('dashboard.admin.table.goals'), align: 'right' },
    { key: 'assists', label: t('dashboard.admin.table.assists'), align: 'right' },
    { key: 'saves', label: t('dashboard.admin.overview.statSaves'), align: 'right' },
    { key: 'rating', label: t('dashboard.admin.overview.statRating'), align: 'right' },
    { key: 'played', label: t('dashboard.admin.table.played'), align: 'right' },
  ]

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 0.5 }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={mode}
          onChange={(_e, v) => v && setMode(v)}
        >
          <ToggleButton value="total" sx={{ py: 0.2, px: 1, fontSize: '0.7rem' }}>
            {t('dashboard.admin.overview.statTotal')}
          </ToggleButton>
          <ToggleButton value="avg" sx={{ py: 0.2, px: 1, fontSize: '0.7rem' }}>
            {t('dashboard.admin.overview.statPerMatch')}
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Box sx={{ height: 204, overflowY: 'auto', overflowX: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {cols.map((c) => (
                <TableCell
                  key={c.key}
                  align={c.align}
                  onClick={() => onSort(c.key)}
                  sx={{ cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}
                >
                  {c.label}
                  {arrow(c.key)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.guid}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.name}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: ACCENT }}>
                  {r.goals}
                </TableCell>
                <TableCell align="right" sx={{ color: ACCENT }}>
                  {r.assists}
                </TableCell>
                <TableCell align="right" sx={{ color: ACCENT }}>
                  {r.saves}
                </TableCell>
                <TableCell align="right" sx={{ color: ACCENT }}>
                  {r.rating}
                </TableCell>
                <TableCell align="right" sx={{ color: ACCENT }}>
                  {r.played}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  )
}

export default function StatCarousel({ standings = [], allMatches = [], t }) {
  const theme = useTheme()
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
  const winRate = useMemo(
    () =>
      standings
        .map((p) => ({
          name: playerName(p),
          rate: played(p) ? Math.round((p.wins / played(p)) * 100) : 0,
        }))
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 8),
    [standings]
  )

  const view = VIEWS[index]
  const go = (delta) => setIndex((i) => (i + delta + VIEWS.length) % VIEWS.length)

  return (
    <Card sx={{ height: '100%', backgroundColor: '#1E1E1E' }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6" sx={{ color: '#C1ACA3' }}>
              {t(`dashboard.admin.overview.${view.key}`)}
            </Typography>
            <Stack direction="row" spacing={0.5}>
              {VIEWS.map((v, i) => (
                <Box
                  key={v.key}
                  sx={{
                    width: i === index ? 16 : 6,
                    height: 6,
                    borderRadius: 3,
                    bgcolor: i === index ? ACCENT : alpha(theme.palette.text.primary, 0.2),
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
          ) : view.kind === 'playerStats' ? (
            <PlayerStatsTable standings={standings} t={t} />
          ) : (
            <Box sx={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                {view.kind === 'area' ? (
                  <AreaChart data={goalsByMatchday}>
                    <defs>
                      <linearGradient id="goalsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={ACCENT} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="md" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <RechartsTooltip />
                    <Area
                      type="monotone"
                      dataKey="goals"
                      stroke={ACCENT}
                      strokeWidth={2}
                      fill="url(#goalsFill)"
                    />
                  </AreaChart>
                ) : (
                  <BarChart layout="vertical" data={winRate} margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 11 }} />
                    <RechartsTooltip formatter={(v) => `${v}%`} />
                    <Bar dataKey="rate" fill={ACCENT} radius={[0, 4, 4, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}
