import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  MenuItem,
  Slider,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { EmptyState, LoadingState } from '../common'
import { INSIGHT_ACCENTS, MATRIX_CELL_TEXT_COLOR } from '../../theme/tokens.js'

const getDashboardGeometry = (theme) => ({
  surfaceRadius: theme.custom?.dashboard?.radius?.surface || '14px',
  surfaceRadiusTight: theme.custom?.dashboard?.radius?.surfaceTight || '12px',
  controlRadius: theme.custom?.dashboard?.radius?.control || '10px',
  badgeRadius: theme.custom?.dashboard?.radius?.badge || '8px',
  subtleBorderAlpha:
    theme.custom?.dashboard?.borderOpacity?.subtle ?? (theme.palette.mode === 'dark' ? 0.12 : 0.08),
  cardShadow:
    theme.custom?.dashboard?.shadows?.card ||
    (theme.palette.mode === 'dark'
      ? '0 14px 28px rgba(0, 0, 0, 0.22)'
      : '0 10px 22px rgba(15, 23, 42, 0.05)'),
})

const buildInsightSurfaceSx = (theme, accent, options = {}) => {
  const isDark = theme.palette.mode === 'dark'
  const geometry = getDashboardGeometry(theme)
  const accentColor = accent?.main || theme.palette.secondary.main
  const { dashed = false } = options

  return {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: geometry.surfaceRadius,
    border: `1px ${dashed ? 'dashed' : 'solid'} ${alpha(
      theme.palette.text.primary,
      geometry.subtleBorderAlpha
    )}`,
    background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, isDark ? 0.97 : 0.96)} 0%, ${alpha(
      theme.palette.background.default,
      isDark ? 0.8 : 0.72
    )} 100%)`,
    boxShadow: geometry.cardShadow,
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      background: `linear-gradient(145deg, ${alpha(accentColor, isDark ? 0.12 : 0.07)} 0%, transparent 42%)`,
      pointerEvents: 'none',
    },
  }
}

const buildInsightContentSx = {
  position: 'relative',
  zIndex: 1,
  p: { xs: 1.2, md: 1.35 },
  '&:last-child': {
    pb: { xs: 1.2, md: 1.35 },
  },
}

const buildInsightInsetSx = (theme, accent) => {
  const isDark = theme.palette.mode === 'dark'
  const geometry = getDashboardGeometry(theme)
  const accentColor = accent?.main || theme.palette.secondary.main

  return {
    borderRadius: geometry.surfaceRadiusTight,
    border: `1px solid ${alpha(theme.palette.text.primary, geometry.subtleBorderAlpha)}`,
    backgroundColor: alpha(theme.palette.background.paper, isDark ? 0.72 : 0.78),
    boxShadow: `inset 0 1px 0 ${alpha(
      accentColor,
      isDark ? 0.08 : 0.04
    )}, inset 0 1px 0 ${alpha(theme.palette.common.white, isDark ? 0.02 : 0.38)}`,
  }
}

const buildInsightChartFrameSx = (theme, accent, height) => ({
  ...buildInsightInsetSx(theme, accent),
  width: '100%',
  height,
  p: { xs: 0.6, md: 0.85 },
})

const buildInsightTableContainerSx = (theme, accent) => ({
  ...buildInsightInsetSx(theme, accent),
  overflow: 'auto',
})

const buildInsightTooltipProps = (theme) => {
  const isDark = theme.palette.mode === 'dark'
  const geometry = getDashboardGeometry(theme)

  return {
    contentStyle: {
      backgroundColor: alpha(theme.palette.background.paper, isDark ? 0.96 : 0.98),
      border: `1px solid ${alpha(theme.palette.text.primary, isDark ? 0.16 : 0.1)}`,
      borderRadius: geometry.controlRadius,
      boxShadow: isDark ? '0 16px 32px rgba(0, 0, 0, 0.28)' : '0 14px 28px rgba(15, 23, 42, 0.12)',
      color: theme.palette.text.primary,
    },
    labelStyle: {
      color: theme.palette.text.primary,
      fontWeight: 700,
      marginBottom: 6,
    },
    itemStyle: {
      color: theme.palette.text.primary,
    },
  }
}

const getRateColor = (rate) => {
  if (rate >= 0.6) {
    return 'success'
  }
  if (rate >= 0.45) {
    return 'warning'
  }
  return 'error'
}

const MATRIX_CELL_SUBTEXT_COLOR = alpha(MATRIX_CELL_TEXT_COLOR, 0.72)

const buildMatrixCellSx = (cell, maxSharedMatches) => {
  if (cell.same_player) {
    return {
      backgroundColor: 'rgba(148, 163, 184, 0.16)',
      color: 'text.secondary',
      fontWeight: 700,
    }
  }

  if (!cell.matches) {
    return {
      backgroundColor: 'rgba(148, 163, 184, 0.08)',
      color: 'text.secondary',
    }
  }

  const sharedRatio = maxSharedMatches > 0 ? cell.matches / maxSharedMatches : 0
  const hue = Math.round(8 + cell.win_rate * 120)
  const saturation = Math.round(35 + sharedRatio * 45)
  const lightness = Math.round(96 - sharedRatio * 28)

  return {
    backgroundColor: `hsl(${hue} ${saturation}% ${lightness}%)`,
    border: '1px solid rgba(15, 23, 42, 0.08)',
    color: MATRIX_CELL_TEXT_COLOR,
  }
}

const matrixLegend = [
  { key: 'low', rate: 0.3, matches: 0.25 },
  { key: 'mid', rate: 0.5, matches: 0.5 },
  { key: 'high', rate: 0.7, matches: 0.75 },
]

const shortSeasonLabel = (guid) => {
  const value = String(guid || '').trim()
  if (!value) {
    return '-'
  }
  return value.slice(0, 8)
}

const buildMetricDeltaChipSx = (accent) => ({
  borderColor: accent.border,
  backgroundColor: accent.soft,
  color: accent.main,
  fontWeight: 700,
})

function InsightMetricCard({ label, value, accent = INSIGHT_ACCENTS.matches }) {
  const theme = useTheme()
  const geometry = getDashboardGeometry(theme)

  return (
    <Card
      variant="outlined"
      sx={{
        ...buildInsightSurfaceSx(theme, accent),
        '&::after': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          backgroundColor: accent.main,
        },
      }}
    >
      <CardContent
        sx={{
          ...buildInsightContentSx,
          py: 1.05,
          '&:last-child': { pb: 1.05 },
        }}
      >
        <Stack spacing={0.35}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ letterSpacing: 0.5, lineHeight: 1.05 }}
          >
            {label}
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              lineHeight: 1.05,
              fontSize: '1.08rem',
            }}
          >
            {value}
          </Typography>
          <Box
            sx={{
              width: 26,
              height: 2,
              borderRadius: geometry.badgeRadius,
              bgcolor: alpha(accent.main, 0.7),
            }}
          />
        </Stack>
      </CardContent>
    </Card>
  )
}

function InsightRankingPanel({
  title,
  emptyText,
  rows,
  t,
  matchLabelKey = 'dashboard.admin.table.played',
}) {
  const theme = useTheme()

  return (
    <Card variant="outlined" sx={buildInsightSurfaceSx(theme, INSIGHT_ACCENTS.matches)}>
      <CardContent sx={buildInsightContentSx}>
        <Stack spacing={1.25}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          {!rows.length && (
            <Typography variant="body2" color="text.secondary">
              {emptyText}
            </Typography>
          )}
          {rows.map((row, index) => (
            <Stack
              key={row.key}
              spacing={0.8}
              sx={{
                p: 1.1,
                ...buildInsightInsetSx(theme, INSIGHT_ACCENTS.matches),
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                <Stack spacing={0.15} sx={{ minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={row.title}
                  >
                    #{index + 1} {row.title}
                  </Typography>
                  {row.subtitle && (
                    <Typography variant="caption" color="text.secondary" title={row.subtitle}>
                      {row.subtitle}
                    </Typography>
                  )}
                </Stack>
                <Stack direction="row" spacing={0.6}>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${t(matchLabelKey)}: ${row.matches}`}
                  />
                  <Chip size="small" color={getRateColor(row.rate)} label={row.rateLabel} />
                </Stack>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={Math.max(0, Math.min(100, Math.round(row.rate * 100)))}
                color={getRateColor(row.rate)}
                sx={{
                  borderRadius: getDashboardGeometry(theme).badgeRadius,
                  height: 8,
                  backgroundColor: alpha(theme.palette.text.primary, 0.08),
                }}
              />
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}

function LeadersCard({ title, metricLabel, items, metricKey, metricAccent, emptyText }) {
  const theme = useTheme()

  return (
    <Card variant="outlined" sx={buildInsightSurfaceSx(theme, metricAccent)}>
      <CardContent sx={buildInsightContentSx}>
        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          {!items.length && (
            <Typography variant="body2" color="text.secondary">
              {emptyText}
            </Typography>
          )}
          {items.map((item, index) => (
            <Stack
              key={item.guid}
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={1}
              sx={{
                py: 0.45,
                borderBottom:
                  index === items.length - 1
                    ? 'none'
                    : `1px solid ${alpha(
                        theme.palette.text.primary,
                        getDashboardGeometry(theme).subtleBorderAlpha
                      )}`,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={item.label}
              >
                {index + 1}. {item.label}
              </Typography>
              <Chip
                size="small"
                variant="outlined"
                sx={{
                  borderColor: metricAccent.border,
                  backgroundColor: metricAccent.soft,
                  color: metricAccent.main,
                  fontWeight: 700,
                }}
                label={`${metricLabel}: ${item[metricKey]}`}
              />
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}

const pairingNodeLabel = (label) => {
  const value = String(label || '').trim()
  if (!value) {
    return '?'
  }
  return value.length > 10 ? `${value.slice(0, 9)}…` : value
}

// Win rate → hue (red → green), same language as the correlation matrix.
const winRateColor = (winRate) => `hsl(${Math.round(8 + (winRate || 0) * 120)} 68% 52%)`

const pairKey = (pair) => `${pair.leftGuid}-${pair.rightGuid}`

function PairingWinRateRow({ label, winRate, formatPercent }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            flexShrink: 0,
            backgroundColor: winRateColor(winRate),
          }}
        />
        <Typography variant="body2" noWrap title={label}>
          {label}
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {formatPercent(winRate)}
      </Typography>
    </Stack>
  )
}

function PairingTooltip({ lines }) {
  return (
    <Stack spacing={0.25}>
      {lines.map((line, index) => (
        <Typography
          key={index}
          variant="caption"
          sx={{ fontWeight: index === 0 ? 700 : 400, whiteSpace: 'nowrap' }}
        >
          {line}
        </Typography>
      ))}
    </Stack>
  )
}

// Ranked list view of the pairs — cleaner / more "app-like" than the graph, and
// shows the pair win rate plus each player's individual win rate inline.
function PairingList({ pairs, t, formatPercent }) {
  const theme = useTheme()
  return (
    <Stack spacing={1}>
      {pairs.map((pair) => (
        <Stack
          key={pairKey(pair)}
          spacing={0.6}
          sx={{ p: 1.1, ...buildInsightInsetSx(theme, INSIGHT_ACCENTS.matches) }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap title={pair.label}>
              {pair.label}
            </Typography>
            <Chip
              size="small"
              color={getRateColor(pair.win_rate)}
              label={formatPercent(pair.win_rate)}
            />
          </Stack>
          <LinearProgress
            variant="determinate"
            value={Math.max(0, Math.min(100, Math.round((pair.win_rate || 0) * 100)))}
            sx={{
              height: 6,
              borderRadius: 999,
              backgroundColor: alpha(theme.palette.text.primary, 0.08),
              '& .MuiLinearProgress-bar': { backgroundColor: winRateColor(pair.win_rate) },
            }}
          />
          <Stack direction="row" spacing={1} justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">
              {`${t('dashboard.admin.table.played')}: ${pair.matches} · ${pair.wins}-${pair.draws}-${pair.losses}`}
            </Typography>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.4, sm: 2 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <PairingWinRateRow
                label={pair.left_label}
                winRate={pair.left_win_rate}
                formatPercent={formatPercent}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <PairingWinRateRow
                label={pair.right_label}
                winRate={pair.right_win_rate}
                formatPercent={formatPercent}
              />
            </Box>
          </Stack>
        </Stack>
      ))}
    </Stack>
  )
}

// Interactive chord graph of the pairs. Nodes sit on a circle; each pair is a
// curved edge (width = matches together, colour = pair win rate). Hovering shows a
// styled tooltip (matches + win rates); selecting an edge/node highlights it and
// drives the detail panel. The SVG scales fluidly (viewBox + width:100%).
function PairingGraph({ pairs, t, formatPercent }) {
  const theme = useTheme()
  const [selected, setSelected] = useState(null)

  const order = []
  const nodeByGuid = {}
  const registerNode = (guid, label, winRate) => {
    if (!(guid in nodeByGuid)) {
      nodeByGuid[guid] = { guid, label: label || guid, winRate: winRate || 0, degree: 0 }
      order.push(guid)
    }
  }
  pairs.forEach((pair) => {
    const [splitLeft = '', splitRight = ''] = String(pair.label || '').split(' + ')
    registerNode(pair.leftGuid, pair.left_label || splitLeft, pair.left_win_rate)
    registerNode(pair.rightGuid, pair.right_label || splitRight, pair.right_win_rate)
    nodeByGuid[pair.leftGuid].degree += pair.matches || 0
    nodeByGuid[pair.rightGuid].degree += pair.matches || 0
  })

  const size = 340
  const center = size / 2
  const radius = center - 60
  const position = {}
  order.forEach((guid, index) => {
    const angle = (index / order.length) * Math.PI * 2 - Math.PI / 2
    position[guid] = { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) }
  })

  const maxMatches = Math.max(1, ...pairs.map((pair) => pair.matches || 0))
  const maxDegree = Math.max(1, ...order.map((guid) => nodeByGuid[guid].degree))
  const nodeColor = INSIGHT_ACCENTS.players.main
  const isDark = theme.palette.mode === 'dark'

  const isEdgeHot = (pair) =>
    selected?.kind === 'edge'
      ? selected.key === pairKey(pair)
      : selected?.kind === 'node'
        ? pair.leftGuid === selected.guid || pair.rightGuid === selected.guid
        : null
  const isNodeHot = (guid) =>
    selected?.kind === 'node'
      ? selected.guid === guid
      : selected?.kind === 'edge'
        ? selected.pair.leftGuid === guid || selected.pair.rightGuid === guid
        : null

  const selectEdge = (pair) =>
    setSelected((prev) =>
      prev?.kind === 'edge' && prev.key === pairKey(pair)
        ? null
        : { kind: 'edge', key: pairKey(pair), pair }
    )
  const selectNode = (guid) =>
    setSelected((prev) =>
      prev?.kind === 'node' && prev.guid === guid ? null : { kind: 'node', guid }
    )

  return (
    <Stack spacing={1}>
      <Box sx={{ ...buildInsightChartFrameSx(theme, INSIGHT_ACCENTS.matches, 'auto') }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width="100%"
          role="img"
          aria-label="Pairing network"
          onClick={() => setSelected(null)}
        >
          {pairs.map((pair) => {
            const a = position[pair.leftGuid]
            const b = position[pair.rightGuid]
            if (!a || !b) {
              return null
            }
            const cx = (a.x + b.x) / 2 + (center - (a.x + b.x) / 2) * 0.45
            const cy = (a.y + b.y) / 2 + (center - (a.y + b.y) / 2) * 0.45
            const hot = isEdgeHot(pair)
            const path = `M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}`
            return (
              <Tooltip
                key={pairKey(pair)}
                arrow
                title={
                  <PairingTooltip
                    lines={[
                      pair.label,
                      `${t('dashboard.admin.table.played')}: ${pair.matches} (${pair.wins}-${pair.draws}-${pair.losses})`,
                      `${t('dashboard.admin.standings.pairingPairWinRate')}: ${formatPercent(pair.win_rate)}`,
                      `${pair.left_label}: ${formatPercent(pair.left_win_rate)}`,
                      `${pair.right_label}: ${formatPercent(pair.right_win_rate)}`,
                    ]}
                  />
                }
              >
                <g
                  style={{ cursor: 'pointer' }}
                  onClick={(event) => {
                    event.stopPropagation()
                    selectEdge(pair)
                  }}
                >
                  {/* wide transparent hit area — easier to click / tap / hover */}
                  <path d={path} fill="none" stroke="transparent" strokeWidth={16} />
                  <path
                    d={path}
                    fill="none"
                    stroke={winRateColor(pair.win_rate)}
                    strokeOpacity={hot === false ? 0.12 : hot ? 1 : 0.85}
                    strokeWidth={(1.5 + ((pair.matches || 0) / maxMatches) * 6) * (hot ? 1.5 : 1)}
                    strokeLinecap="round"
                    style={{
                      pointerEvents: 'none',
                      transition: 'stroke-opacity .15s, stroke-width .15s',
                    }}
                  />
                </g>
              </Tooltip>
            )
          })}
          {order.map((guid) => {
            const node = nodeByGuid[guid]
            const point = position[guid]
            const nodeRadius = 9 + (node.degree / maxDegree) * 8
            const labelOutside = point.y < center
            const hot = isNodeHot(guid)
            return (
              <Tooltip
                key={guid}
                arrow
                title={
                  <PairingTooltip
                    lines={[
                      node.label,
                      `${t('dashboard.admin.standings.winRateColumn')}: ${formatPercent(node.winRate)}`,
                      `${t('dashboard.admin.table.played')}: ${node.degree}`,
                    ]}
                  />
                }
              >
                <g
                  style={{ cursor: 'pointer' }}
                  onClick={(event) => {
                    event.stopPropagation()
                    selectNode(guid)
                  }}
                >
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={hot ? nodeRadius + 2 : nodeRadius}
                    fill={nodeColor}
                    fillOpacity={hot === false ? 0.3 : 1}
                    stroke={
                      hot
                        ? winRateColor(node.winRate)
                        : alpha(theme.palette.background.paper, isDark ? 0.9 : 1)
                    }
                    strokeWidth={hot ? 3 : 2}
                    style={{ transition: 'r .15s, fill-opacity .15s' }}
                  />
                  <text
                    x={point.x}
                    y={labelOutside ? point.y - nodeRadius - 5 : point.y + nodeRadius + 11}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill={
                      hot === false ? theme.palette.text.disabled : theme.palette.text.secondary
                    }
                    style={{ pointerEvents: 'none' }}
                  >
                    {pairingNodeLabel(node.label)}
                  </text>
                </g>
              </Tooltip>
            )
          })}
        </svg>
      </Box>

      <Box sx={{ ...buildInsightInsetSx(theme, INSIGHT_ACCENTS.matches), p: 1.1, minHeight: 92 }}>
        {!selected && (
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.admin.standings.pairingSelectHint')}
          </Typography>
        )}
        {selected?.kind === 'edge' && (
          <Stack spacing={0.6}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700 }}
                noWrap
                title={selected.pair.label}
              >
                {selected.pair.label}
              </Typography>
              <Chip
                size="small"
                color={getRateColor(selected.pair.win_rate)}
                label={`${t('dashboard.admin.standings.pairingPairWinRate')}: ${formatPercent(selected.pair.win_rate)}`}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {`${t('dashboard.admin.table.played')}: ${selected.pair.matches} · ${selected.pair.wins}-${selected.pair.draws}-${selected.pair.losses}`}
            </Typography>
            <PairingWinRateRow
              label={selected.pair.left_label || nodeByGuid[selected.pair.leftGuid]?.label}
              winRate={selected.pair.left_win_rate}
              formatPercent={formatPercent}
            />
            <PairingWinRateRow
              label={selected.pair.right_label || nodeByGuid[selected.pair.rightGuid]?.label}
              winRate={selected.pair.right_win_rate}
              formatPercent={formatPercent}
            />
          </Stack>
        )}
        {selected?.kind === 'node' && nodeByGuid[selected.guid] && (
          <Stack spacing={0.6}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
              {nodeByGuid[selected.guid].label}
            </Typography>
            <PairingWinRateRow
              label={t('dashboard.admin.standings.winRateColumn')}
              winRate={nodeByGuid[selected.guid].winRate}
              formatPercent={formatPercent}
            />
            <Typography variant="caption" color="text.secondary">
              {`${t('dashboard.admin.table.played')}: ${nodeByGuid[selected.guid].degree}`}
            </Typography>
          </Stack>
        )}
      </Box>

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box
            sx={{
              width: 28,
              height: 9,
              borderRadius: 999,
              background: `linear-gradient(90deg, ${winRateColor(0)}, ${winRateColor(0.5)}, ${winRateColor(1)})`,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {t('dashboard.admin.standings.pairingLegendWinRate')}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box
            sx={{
              width: 28,
              height: 0,
              borderTop: `6px solid ${alpha(theme.palette.text.primary, 0.5)}`,
              borderRadius: 999,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {t('dashboard.admin.standings.pairingLegendThickness')}
          </Typography>
        </Stack>
      </Stack>
    </Stack>
  )
}

// Wraps the pairing views: a toolbar to switch graph/list and a min-matches
// filter (client-side), then renders the chosen view over the filtered pairs.
function PairingExplorer({ pairs, emptyText, t, formatPercent }) {
  const theme = useTheme()
  const [view, setView] = useState('graph')
  const [minMatches, setMinMatches] = useState(1)

  if (!pairs.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyText}
      </Typography>
    )
  }

  const maxMatches = Math.max(...pairs.map((pair) => pair.matches || 0), 1)
  const filtered = pairs.filter((pair) => (pair.matches || 0) >= minMatches)

  return (
    <Stack spacing={1.25}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
      >
        <ToggleButtonGroup
          size="small"
          exclusive
          value={view}
          onChange={(_, next) => next && setView(next)}
        >
          <ToggleButton value="graph">
            {t('dashboard.admin.standings.pairingViewGraph')}
          </ToggleButton>
          <ToggleButton value="list">{t('dashboard.admin.standings.pairingViewList')}</ToggleButton>
        </ToggleButtonGroup>
        {maxMatches > 1 && (
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ minWidth: 180, flex: 1, maxWidth: 280 }}
          >
            <Typography variant="caption" color="text.secondary" noWrap>
              {t('dashboard.admin.standings.pairingMinMatches', { count: minMatches })}
            </Typography>
            <Slider
              size="small"
              min={1}
              max={maxMatches}
              value={minMatches}
              onChange={(_, value) => setMinMatches(value)}
              valueLabelDisplay="auto"
            />
          </Stack>
        )}
      </Stack>

      {!filtered.length && (
        <Typography variant="body2" color="text.secondary">
          {t('dashboard.admin.standings.pairingNoneForFilter')}
        </Typography>
      )}
      {filtered.length > 0 && view === 'graph' && (
        <PairingGraph pairs={filtered} t={t} formatPercent={formatPercent} />
      )}
      {filtered.length > 0 && view === 'list' && (
        <PairingList pairs={filtered} t={t} formatPercent={formatPercent} />
      )}
    </Stack>
  )
}

export default function AdminInsightsSection({ state, actions, helpers }) {
  const theme = useTheme()
  const geometry = getDashboardGeometry(theme)
  const isDark = theme.palette.mode === 'dark'
  const chartTooltipProps = buildInsightTooltipProps(theme)
  const {
    selectedSeasonGuid,
    insightsScope,
    insightsLoading,
    insightsReport,
    insightsComparisonReport,
    insightsComparison,
  } = state
  const { onInsightsScopeChange, onRefreshInsights } = actions
  const { t, formatDecimal, formatSignedDecimal, formatPercent } = helpers

  // Progressive disclosure: heavy content (charts / rankings / matrix) is split
  // into tabs so only one group mounts at a time. This also defers the recharts
  // render work until the Trends tab is opened.
  const [activeInsightTab, setActiveInsightTab] = useState('trends')
  // Section-level date range (re-fetched from the backend on apply) + graph-local
  // min-matches filter (applied client-side, no re-fetch).
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const applyInsights = () => onRefreshInsights({ dateFrom, dateTo })
  const clearDates = () => {
    setDateFrom('')
    setDateTo('')
    onRefreshInsights({ dateFrom: '', dateTo: '' })
  }

  const maxSharedMatches =
    insightsReport?.matrix_rows?.reduce((maxValue, row) => {
      const rowMax = (row.cells || []).reduce(
        (cellMax, cell) => Math.max(cellMax, cell.matches || 0),
        0
      )
      return Math.max(maxValue, rowMax)
    }, 0) || 0

  const pairRows = (insightsReport?.top_pairs || []).slice(0, 10).map((pair) => ({
    key: `${pair.leftGuid}-${pair.rightGuid}`,
    title: pair.label,
    subtitle: `${pair.wins}-${pair.draws}-${pair.losses}`,
    matches: pair.matches,
    rate: pair.win_rate,
    rateLabel: formatPercent(pair.win_rate),
  }))

  const teammateRows = (insightsReport?.top_teammates_by_player || []).slice(0, 10).map((item) => ({
    key: `${item.player_guid}-${item.partner_guid}`,
    title: item.player_label,
    subtitle: `${t('dashboard.admin.standings.bestTeammateColumn')}: ${item.partner_label}`,
    matches: item.matches,
    rate: item.win_rate,
    rateLabel: formatPercent(item.win_rate),
  }))

  const timelineMatchData = (insightsReport?.timeline_by_match || []).map((item) => ({
    ...item,
    x_label: item.match_date ? item.match_date.slice(5) : item.label,
  }))

  const timelineSeasonData = (insightsReport?.timeline_by_season || []).map((item, index) => ({
    ...item,
    x_label: `S${index + 1}`,
    season_label: shortSeasonLabel(item.season_guid),
  }))

  // Radar: compare the top scorer / assister / saver across normalized axes. Each
  // axis is scaled to its own leader so different units (goals vs win rate) compare.
  const radarLeaders = (() => {
    const leaders = insightsReport?.leaders || {}
    const byGuid = new Map()
    ;[leaders.scorers?.[0], leaders.assisters?.[0], leaders.savers?.[0]]
      .filter(Boolean)
      .forEach((player) => {
        if (!byGuid.has(player.guid)) {
          byGuid.set(player.guid, player)
        }
      })
    return Array.from(byGuid.values())
  })()

  const radarAxes = [
    { key: 'goals', label: t('dashboard.common.matchDetail.goals') },
    { key: 'assists', label: t('dashboard.common.matchDetail.assists') },
    { key: 'saves', label: t('dashboard.common.matchDetail.saves') },
    { key: 'rating', label: t('dashboard.admin.standings.radarAxisRating'), scaleMax: 10 },
    { key: 'win_rate', label: t('dashboard.admin.standings.radarAxisWinRate'), scaleMax: 1 },
  ]

  const radarData = radarAxes.map((axis) => {
    const axisMax = axis.scaleMax ?? Math.max(1, ...radarLeaders.map((p) => p[axis.key] || 0))
    const point = { axis: axis.label }
    radarLeaders.forEach((player, index) => {
      point[`player_${index}`] = Math.round(((player[axis.key] || 0) / axisMax) * 100)
    })
    return point
  })

  const radarColors = [INSIGHT_ACCENTS.goals, INSIGHT_ACCENTS.assists, INSIGHT_ACCENTS.saves]

  const positionData = (insightsReport?.position_breakdown || []).map((row) => ({
    position: row.position || t('dashboard.admin.standings.unknownPosition'),
    goals: row.goals,
    assists: row.assists,
  }))

  const ratingData = (insightsReport?.rating_distribution || []).map((row) => ({
    label: `${row.bucket}–${row.bucket + 1}`,
    count: row.count,
  }))

  const pairingPairs = (insightsReport?.top_pairs || []).slice(0, 8)

  const goalTimelineData = (insightsReport?.goal_timeline || []).map((row) => ({
    ...row,
    label: `${row.minute_from}–${row.minute_to}'`,
  }))

  return (
    <Stack spacing={2.25} sx={{ width: '100%' }}>
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        spacing={1.5}
        alignItems={{ lg: 'center' }}
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="h6">{t('dashboard.admin.standings.insightsTitle')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.admin.standings.insightsDescription')}
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
          <TextField
            select
            size="small"
            label={t('dashboard.admin.standings.insightsScopeLabel')}
            value={insightsScope}
            onChange={(event) => onInsightsScopeChange(event.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="selected_season">
              {t('dashboard.admin.standings.insightsScopeSelectedSeason')}
            </MenuItem>
            <MenuItem value="all_seasons">
              {t('dashboard.admin.standings.insightsScopeAllSeasons')}
            </MenuItem>
          </TextField>
          <TextField
            type="date"
            size="small"
            label={t('dashboard.admin.standings.insightsDateFrom')}
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: dateTo || undefined }}
            sx={{ minWidth: 150 }}
          />
          <TextField
            type="date"
            size="small"
            label={t('dashboard.admin.standings.insightsDateTo')}
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: dateFrom || undefined }}
            sx={{ minWidth: 150 }}
          />
          {(dateFrom || dateTo) && (
            <Button onClick={clearDates} disabled={insightsLoading}>
              {t('dashboard.admin.standings.insightsClearDates')}
            </Button>
          )}
          <Button
            variant="contained"
            onClick={applyInsights}
            disabled={insightsLoading || !selectedSeasonGuid}
          >
            {t('dashboard.admin.standings.refreshInsights')}
          </Button>
        </Stack>
      </Stack>

      {insightsLoading && <LoadingState />}

      {!insightsLoading && !insightsReport && (
        <EmptyState
          dense
          description={t('dashboard.admin.standings.insightsEmpty')}
          action={
            <Button variant="contained" onClick={onRefreshInsights} disabled={!selectedSeasonGuid}>
              {t('dashboard.admin.standings.refreshInsights')}
            </Button>
          }
        />
      )}

      {!insightsLoading && insightsReport && (
        <Stack spacing={2.25}>
          <Grid container spacing={1.2}>
            <Grid item xs={12} sm={6} md={4} xl={2}>
              <InsightMetricCard
                label={t('dashboard.admin.standings.insightsKpiMatches')}
                value={insightsReport.matches_analyzed}
                accent={INSIGHT_ACCENTS.matches}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} xl={2}>
              <InsightMetricCard
                label={t('dashboard.admin.standings.insightsKpiSeasons')}
                value={insightsReport.seasons_analyzed}
                accent={INSIGHT_ACCENTS.seasons}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} xl={2}>
              <InsightMetricCard
                label={t('dashboard.admin.standings.insightsKpiGoalsPerMatch')}
                value={formatDecimal(insightsReport.goals_per_match)}
                accent={INSIGHT_ACCENTS.goals}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} xl={2}>
              <InsightMetricCard
                label={t('dashboard.admin.standings.insightsKpiAssistsPerMatch')}
                value={formatDecimal(insightsReport.assists_per_match)}
                accent={INSIGHT_ACCENTS.assists}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} xl={2}>
              <InsightMetricCard
                label={t('dashboard.admin.standings.insightsKpiSavesPerMatch')}
                value={formatDecimal(insightsReport.saves_per_match)}
                accent={INSIGHT_ACCENTS.saves}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} xl={2}>
              <InsightMetricCard
                label={t('dashboard.admin.standings.insightsKpiPlayersPerTeam')}
                value={formatDecimal(insightsReport.average_players_per_team)}
                accent={INSIGHT_ACCENTS.players}
              />
            </Grid>
          </Grid>

          {insightsComparisonReport && insightsComparison && (
            <Card variant="outlined" sx={buildInsightSurfaceSx(theme, INSIGHT_ACCENTS.assists)}>
              <CardContent sx={buildInsightContentSx}>
                <Stack spacing={1.2}>
                  <Alert
                    severity="info"
                    sx={{
                      mb: 0,
                      py: 0.45,
                      borderRadius: geometry.surfaceRadiusTight,
                      backgroundColor: alpha(theme.palette.info.main, isDark ? 0.12 : 0.08),
                    }}
                  >
                    {t('dashboard.admin.standings.insightsComparisonSummary', {
                      scope:
                        insightsScope === 'selected_season'
                          ? t('dashboard.admin.standings.insightsScopeAllSeasons')
                          : t('dashboard.admin.standings.insightsScopeSelectedSeason'),
                      goalsDelta: formatSignedDecimal(insightsComparison.goals_per_match_delta),
                      assistsDelta: formatSignedDecimal(insightsComparison.assists_per_match_delta),
                      savesDelta: formatSignedDecimal(insightsComparison.saves_per_match_delta),
                    })}
                  </Alert>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    <Chip
                      size="small"
                      variant="outlined"
                      sx={buildMetricDeltaChipSx(INSIGHT_ACCENTS.goals)}
                      label={`G/MP ${formatSignedDecimal(insightsComparison.goals_per_match_delta)}`}
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      sx={buildMetricDeltaChipSx(INSIGHT_ACCENTS.assists)}
                      label={`A/MP ${formatSignedDecimal(insightsComparison.assists_per_match_delta)}`}
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      sx={buildMetricDeltaChipSx(INSIGHT_ACCENTS.saves)}
                      label={`S/MP ${formatSignedDecimal(insightsComparison.saves_per_match_delta)}`}
                    />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          )}

          <Tabs
            value={activeInsightTab}
            onChange={(_, next) => setActiveInsightTab(next)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab value="trends" label={t('dashboard.admin.standings.insightsTabTrends')} />
            <Tab value="rankings" label={t('dashboard.admin.standings.insightsTabRankings')} />
            <Tab value="matrix" label={t('dashboard.admin.standings.insightsTabMatrix')} />
            <Tab value="profiles" label={t('dashboard.admin.standings.insightsTabProfiles')} />
          </Tabs>

          {activeInsightTab === 'trends' && (
            <Stack spacing={2.25}>
              <Grid container spacing={2}>
                <Grid item xs={12} lg={8}>
                  <Card
                    variant="outlined"
                    sx={buildInsightSurfaceSx(theme, INSIGHT_ACCENTS.assists)}
                  >
                    <CardContent sx={buildInsightContentSx}>
                      <Stack spacing={1.25}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {t('dashboard.admin.standings.chartTrendByMatchTitle')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t('dashboard.admin.standings.chartTrendByMatchDescription')}
                        </Typography>
                        {!timelineMatchData.length && (
                          <Typography variant="body2" color="text.secondary">
                            {t('dashboard.admin.standings.insightsNoData')}
                          </Typography>
                        )}
                        {timelineMatchData.length > 0 && (
                          <Box sx={buildInsightChartFrameSx(theme, INSIGHT_ACCENTS.assists, 280)}>
                            <ResponsiveContainer>
                              <LineChart data={timelineMatchData}>
                                <CartesianGrid
                                  stroke={alpha(theme.palette.text.primary, isDark ? 0.12 : 0.08)}
                                  strokeDasharray="3 3"
                                />
                                <XAxis
                                  dataKey="x_label"
                                  minTickGap={28}
                                  tickLine={false}
                                  axisLine={{ stroke: alpha(theme.palette.text.primary, 0.12) }}
                                  tick={{
                                    fill: theme.palette.text.secondary,
                                    fontSize: 11,
                                    fontFamily: theme.typography.fontFamily,
                                  }}
                                />
                                <YAxis
                                  allowDecimals={false}
                                  tickLine={false}
                                  axisLine={false}
                                  tick={{
                                    fill: theme.palette.text.secondary,
                                    fontSize: 11,
                                    fontFamily: theme.typography.fontFamily,
                                  }}
                                />
                                <RechartsTooltip
                                  {...chartTooltipProps}
                                  formatter={(value, name) => [`${value}`, name]}
                                  labelFormatter={(label, payload) => {
                                    const point = payload?.[0]?.payload
                                    return point?.match_date || label
                                  }}
                                />
                                <Legend />
                                <Line
                                  type="monotone"
                                  dataKey="goals"
                                  name={t('dashboard.common.matchDetail.goals')}
                                  stroke={INSIGHT_ACCENTS.goals.main}
                                  strokeWidth={2}
                                  dot={false}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="assists"
                                  name={t('dashboard.common.matchDetail.assists')}
                                  stroke={INSIGHT_ACCENTS.assists.main}
                                  strokeWidth={2}
                                  dot={false}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="saves"
                                  name={t('dashboard.common.matchDetail.saves')}
                                  stroke={INSIGHT_ACCENTS.saves.main}
                                  strokeWidth={2}
                                  dot={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} lg={4}>
                  <Card variant="outlined" sx={buildInsightSurfaceSx(theme, INSIGHT_ACCENTS.goals)}>
                    <CardContent sx={buildInsightContentSx}>
                      <Stack spacing={1.25}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {t('dashboard.admin.standings.chartRunningAveragesTitle')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t('dashboard.admin.standings.chartRunningAveragesDescription')}
                        </Typography>
                        {!timelineMatchData.length && (
                          <Typography variant="body2" color="text.secondary">
                            {t('dashboard.admin.standings.insightsNoData')}
                          </Typography>
                        )}
                        {timelineMatchData.length > 0 && (
                          <Box sx={buildInsightChartFrameSx(theme, INSIGHT_ACCENTS.goals, 280)}>
                            <ResponsiveContainer>
                              <LineChart data={timelineMatchData}>
                                <CartesianGrid
                                  stroke={alpha(theme.palette.text.primary, isDark ? 0.12 : 0.08)}
                                  strokeDasharray="3 3"
                                />
                                <XAxis
                                  dataKey="x_label"
                                  minTickGap={30}
                                  tickLine={false}
                                  axisLine={{ stroke: alpha(theme.palette.text.primary, 0.12) }}
                                  tick={{
                                    fill: theme.palette.text.secondary,
                                    fontSize: 11,
                                    fontFamily: theme.typography.fontFamily,
                                  }}
                                />
                                <YAxis
                                  tickLine={false}
                                  axisLine={false}
                                  tick={{
                                    fill: theme.palette.text.secondary,
                                    fontSize: 11,
                                    fontFamily: theme.typography.fontFamily,
                                  }}
                                />
                                <RechartsTooltip
                                  {...chartTooltipProps}
                                  formatter={(value, name) => [formatDecimal(value), name]}
                                  labelFormatter={(label, payload) => {
                                    const point = payload?.[0]?.payload
                                    return point?.match_date || label
                                  }}
                                />
                                <Legend />
                                <Line
                                  type="monotone"
                                  dataKey="running_goals_per_match"
                                  name={t('dashboard.admin.standings.insightsKpiGoalsPerMatch')}
                                  stroke={INSIGHT_ACCENTS.goals.main}
                                  strokeWidth={2}
                                  strokeDasharray="6 4"
                                  dot={false}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="running_assists_per_match"
                                  name={t('dashboard.admin.standings.insightsKpiAssistsPerMatch')}
                                  stroke={INSIGHT_ACCENTS.assists.main}
                                  strokeWidth={2}
                                  strokeDasharray="6 4"
                                  dot={false}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="running_saves_per_match"
                                  name={t('dashboard.admin.standings.insightsKpiSavesPerMatch')}
                                  stroke={INSIGHT_ACCENTS.saves.main}
                                  strokeWidth={2}
                                  strokeDasharray="6 4"
                                  dot={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Card variant="outlined" sx={buildInsightSurfaceSx(theme, INSIGHT_ACCENTS.saves)}>
                <CardContent sx={buildInsightContentSx}>
                  <Stack spacing={1.25}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {t('dashboard.admin.standings.chartSeasonComparisonTitle')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('dashboard.admin.standings.chartSeasonComparisonDescription')}
                    </Typography>
                    {!timelineSeasonData.length && (
                      <Typography variant="body2" color="text.secondary">
                        {t('dashboard.admin.standings.insightsNoData')}
                      </Typography>
                    )}
                    {timelineSeasonData.length > 0 && (
                      <Box sx={buildInsightChartFrameSx(theme, INSIGHT_ACCENTS.saves, 300)}>
                        <ResponsiveContainer>
                          <BarChart data={timelineSeasonData}>
                            <CartesianGrid
                              stroke={alpha(theme.palette.text.primary, isDark ? 0.12 : 0.08)}
                              strokeDasharray="3 3"
                            />
                            <XAxis
                              dataKey="x_label"
                              tickLine={false}
                              axisLine={{ stroke: alpha(theme.palette.text.primary, 0.12) }}
                              tick={{
                                fill: theme.palette.text.secondary,
                                fontSize: 11,
                                fontFamily: theme.typography.fontFamily,
                              }}
                            />
                            <YAxis
                              tickLine={false}
                              axisLine={false}
                              tick={{
                                fill: theme.palette.text.secondary,
                                fontSize: 11,
                                fontFamily: theme.typography.fontFamily,
                              }}
                            />
                            <RechartsTooltip
                              {...chartTooltipProps}
                              formatter={(value, name, payload) => [formatDecimal(value), name]}
                              labelFormatter={(label, payload) => {
                                const point = payload?.[0]?.payload
                                return point?.season_label || label
                              }}
                            />
                            <Legend />
                            <Bar
                              dataKey="goals_per_match"
                              name={t('dashboard.admin.standings.insightsKpiGoalsPerMatch')}
                              fill={INSIGHT_ACCENTS.goals.main}
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar
                              dataKey="assists_per_match"
                              name={t('dashboard.admin.standings.insightsKpiAssistsPerMatch')}
                              fill={INSIGHT_ACCENTS.assists.main}
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar
                              dataKey="saves_per_match"
                              name={t('dashboard.admin.standings.insightsKpiSavesPerMatch')}
                              fill={INSIGHT_ACCENTS.saves.main}
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          )}

          {activeInsightTab === 'rankings' && (
            <Grid container spacing={2}>
              <Grid item xs={12} lg={6}>
                <InsightRankingPanel
                  title={t('dashboard.admin.standings.topPairsTitle')}
                  emptyText={t('dashboard.admin.standings.insightsNoData')}
                  rows={pairRows}
                  t={t}
                />
              </Grid>
              <Grid item xs={12} lg={6}>
                <InsightRankingPanel
                  title={t('dashboard.admin.standings.topTeammatesTitle')}
                  emptyText={t('dashboard.admin.standings.insightsNoData')}
                  rows={teammateRows}
                  t={t}
                />
              </Grid>
            </Grid>
          )}

          {activeInsightTab === 'matrix' && (
            <Card variant="outlined" sx={buildInsightSurfaceSx(theme, INSIGHT_ACCENTS.players)}>
              <CardContent sx={buildInsightContentSx}>
                <Stack spacing={1.2}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {t('dashboard.admin.standings.correlationMatrixTitle')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('dashboard.admin.standings.correlationMatrixDescription')}
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {matrixLegend.map((item) => (
                      <Chip
                        key={item.key}
                        size="small"
                        variant="outlined"
                        sx={buildMatrixCellSx(
                          {
                            same_player: false,
                            matches: Math.max(1, Math.round(maxSharedMatches * item.matches)),
                            win_rate: item.rate,
                          },
                          maxSharedMatches || 1
                        )}
                        label={t(
                          `dashboard.admin.standings.correlationLegend${item.key[0].toUpperCase()}${item.key.slice(1)}`
                        )}
                      />
                    ))}
                  </Stack>

                  {!insightsReport.matrix_players.length && (
                    <Typography variant="body2" color="text.secondary">
                      {t('dashboard.admin.standings.insightsNoData')}
                    </Typography>
                  )}

                  {insightsReport.matrix_players.length > 0 && (
                    <TableContainer
                      sx={buildInsightTableContainerSx(theme, INSIGHT_ACCENTS.players)}
                    >
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ minWidth: 220 }}>
                              {t('dashboard.admin.table.player')}
                            </TableCell>
                            {insightsReport.matrix_players.map((player) => (
                              <TableCell key={player.guid} align="center" sx={{ minWidth: 110 }}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    display: 'block',
                                    fontWeight: 700,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                  title={player.label}
                                >
                                  {player.label}
                                </Typography>
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {insightsReport.matrix_rows.map((row) => (
                            <TableRow key={row.player.guid}>
                              <TableCell>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 700,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: 250,
                                  }}
                                  title={row.player.label}
                                >
                                  {row.player.label}
                                </Typography>
                              </TableCell>
                              {row.cells.map((cell) => (
                                <Tooltip
                                  key={`${cell.player_guid}-${cell.teammate_guid}`}
                                  title={
                                    cell.same_player
                                      ? t('dashboard.admin.standings.correlationSamePlayer')
                                      : cell.matches
                                        ? t('dashboard.admin.standings.correlationCellTooltip', {
                                            matches: cell.matches,
                                            wins: cell.wins,
                                            draws: cell.draws,
                                            losses: cell.losses,
                                            winRate: formatPercent(cell.win_rate),
                                          })
                                        : t('dashboard.admin.standings.correlationNoMatches')
                                  }
                                  arrow
                                >
                                  <TableCell
                                    align="center"
                                    sx={buildMatrixCellSx(cell, maxSharedMatches)}
                                  >
                                    {cell.same_player ? (
                                      <Typography variant="caption" sx={{ color: 'inherit' }}>
                                        —
                                      </Typography>
                                    ) : cell.matches ? (
                                      <Stack spacing={0.2}>
                                        <Typography
                                          variant="caption"
                                          sx={{ color: 'inherit', fontWeight: 700 }}
                                        >
                                          {formatPercent(cell.win_rate)}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          sx={{ color: MATRIX_CELL_SUBTEXT_COLOR }}
                                        >
                                          {cell.matches}
                                        </Typography>
                                      </Stack>
                                    ) : (
                                      <Typography variant="caption" sx={{ color: 'inherit' }}>
                                        -
                                      </Typography>
                                    )}
                                  </TableCell>
                                </Tooltip>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}

          {activeInsightTab === 'profiles' && (
            <Grid container spacing={2}>
              <Grid item xs={12} lg={8}>
                <Card variant="outlined" sx={buildInsightSurfaceSx(theme, INSIGHT_ACCENTS.goals)}>
                  <CardContent sx={buildInsightContentSx}>
                    <Stack spacing={1.25}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {t('dashboard.admin.standings.goalMomentumTitle')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('dashboard.admin.standings.goalMomentumDescription')}
                      </Typography>
                      {!goalTimelineData.length && (
                        <Typography variant="body2" color="text.secondary">
                          {t('dashboard.admin.standings.insightsNoData')}
                        </Typography>
                      )}
                      {goalTimelineData.length > 0 && (
                        <Box sx={buildInsightChartFrameSx(theme, INSIGHT_ACCENTS.goals, 280)}>
                          <ResponsiveContainer>
                            <AreaChart data={goalTimelineData}>
                              <defs>
                                <linearGradient id="goalMomentumFill" x1="0" y1="0" x2="0" y2="1">
                                  <stop
                                    offset="0%"
                                    stopColor={INSIGHT_ACCENTS.goals.main}
                                    stopOpacity={0.35}
                                  />
                                  <stop
                                    offset="100%"
                                    stopColor={INSIGHT_ACCENTS.goals.main}
                                    stopOpacity={0.02}
                                  />
                                </linearGradient>
                              </defs>
                              <CartesianGrid
                                stroke={alpha(theme.palette.text.primary, isDark ? 0.12 : 0.08)}
                                strokeDasharray="3 3"
                              />
                              <XAxis
                                dataKey="label"
                                tickLine={false}
                                axisLine={{ stroke: alpha(theme.palette.text.primary, 0.12) }}
                                tick={{
                                  fill: theme.palette.text.secondary,
                                  fontSize: 11,
                                  fontFamily: theme.typography.fontFamily,
                                }}
                              />
                              <YAxis
                                allowDecimals={false}
                                tickLine={false}
                                axisLine={false}
                                tick={{
                                  fill: theme.palette.text.secondary,
                                  fontSize: 11,
                                  fontFamily: theme.typography.fontFamily,
                                }}
                              />
                              <RechartsTooltip {...chartTooltipProps} />
                              <Area
                                type="monotone"
                                dataKey="cumulative_goals"
                                name={t('dashboard.admin.standings.goalMomentumCumulative')}
                                stroke={INSIGHT_ACCENTS.goals.main}
                                strokeWidth={2}
                                fill="url(#goalMomentumFill)"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} lg={4}>
                <Card variant="outlined" sx={buildInsightSurfaceSx(theme, INSIGHT_ACCENTS.saves)}>
                  <CardContent sx={buildInsightContentSx}>
                    <Stack spacing={1.25}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {t('dashboard.admin.standings.goalBucketsTitle')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('dashboard.admin.standings.goalBucketsDescription')}
                      </Typography>
                      {!goalTimelineData.length && (
                        <Typography variant="body2" color="text.secondary">
                          {t('dashboard.admin.standings.insightsNoData')}
                        </Typography>
                      )}
                      {goalTimelineData.length > 0 && (
                        <Box sx={buildInsightChartFrameSx(theme, INSIGHT_ACCENTS.saves, 280)}>
                          <ResponsiveContainer>
                            <BarChart data={goalTimelineData}>
                              <CartesianGrid
                                stroke={alpha(theme.palette.text.primary, isDark ? 0.12 : 0.08)}
                                strokeDasharray="3 3"
                              />
                              <XAxis
                                dataKey="label"
                                tickLine={false}
                                axisLine={{ stroke: alpha(theme.palette.text.primary, 0.12) }}
                                tick={{
                                  fill: theme.palette.text.secondary,
                                  fontSize: 11,
                                  fontFamily: theme.typography.fontFamily,
                                }}
                              />
                              <YAxis
                                allowDecimals={false}
                                tickLine={false}
                                axisLine={false}
                                tick={{
                                  fill: theme.palette.text.secondary,
                                  fontSize: 11,
                                  fontFamily: theme.typography.fontFamily,
                                }}
                              />
                              <RechartsTooltip {...chartTooltipProps} />
                              <Bar
                                dataKey="goals"
                                name={t('dashboard.common.matchDetail.goals')}
                                fill={INSIGHT_ACCENTS.saves.main}
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} lg={6}>
                <Card variant="outlined" sx={buildInsightSurfaceSx(theme, INSIGHT_ACCENTS.matches)}>
                  <CardContent sx={buildInsightContentSx}>
                    <Stack spacing={1.25}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {t('dashboard.admin.standings.pairingNetworkTitle')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('dashboard.admin.standings.pairingNetworkDescription')}
                      </Typography>
                      <PairingExplorer
                        pairs={pairingPairs}
                        emptyText={t('dashboard.admin.standings.insightsNoData')}
                        t={t}
                        formatPercent={formatPercent}
                      />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} lg={6}>
                <Card variant="outlined" sx={buildInsightSurfaceSx(theme, INSIGHT_ACCENTS.seasons)}>
                  <CardContent sx={buildInsightContentSx}>
                    <Stack spacing={1.25}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {t('dashboard.admin.standings.radarTitle')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('dashboard.admin.standings.radarDescription')}
                      </Typography>
                      {!radarLeaders.length && (
                        <Typography variant="body2" color="text.secondary">
                          {t('dashboard.admin.standings.insightsNoData')}
                        </Typography>
                      )}
                      {radarLeaders.length > 0 && (
                        <Box sx={buildInsightChartFrameSx(theme, INSIGHT_ACCENTS.seasons, 300)}>
                          <ResponsiveContainer>
                            <RadarChart data={radarData} outerRadius="72%">
                              <PolarGrid
                                stroke={alpha(theme.palette.text.primary, isDark ? 0.16 : 0.12)}
                              />
                              <PolarAngleAxis
                                dataKey="axis"
                                tick={{
                                  fill: theme.palette.text.secondary,
                                  fontSize: 11,
                                  fontFamily: theme.typography.fontFamily,
                                }}
                              />
                              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                              <RechartsTooltip
                                {...chartTooltipProps}
                                formatter={(value, name) => [`${value}%`, name]}
                              />
                              <Legend />
                              {radarLeaders.map((player, index) => {
                                const accent = radarColors[index % radarColors.length]
                                return (
                                  <Radar
                                    key={player.guid}
                                    name={player.label}
                                    dataKey={`player_${index}`}
                                    stroke={accent.main}
                                    fill={accent.main}
                                    fillOpacity={0.18}
                                  />
                                )
                              })}
                            </RadarChart>
                          </ResponsiveContainer>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} lg={6}>
                <Card variant="outlined" sx={buildInsightSurfaceSx(theme, INSIGHT_ACCENTS.goals)}>
                  <CardContent sx={buildInsightContentSx}>
                    <Stack spacing={1.25}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {t('dashboard.admin.standings.positionContributionTitle')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('dashboard.admin.standings.positionContributionDescription')}
                      </Typography>
                      {!positionData.length && (
                        <Typography variant="body2" color="text.secondary">
                          {t('dashboard.admin.standings.insightsNoData')}
                        </Typography>
                      )}
                      {positionData.length > 0 && (
                        <Box sx={buildInsightChartFrameSx(theme, INSIGHT_ACCENTS.goals, 300)}>
                          <ResponsiveContainer>
                            <BarChart data={positionData}>
                              <CartesianGrid
                                stroke={alpha(theme.palette.text.primary, isDark ? 0.12 : 0.08)}
                                strokeDasharray="3 3"
                              />
                              <XAxis
                                dataKey="position"
                                tickLine={false}
                                axisLine={{ stroke: alpha(theme.palette.text.primary, 0.12) }}
                                tick={{
                                  fill: theme.palette.text.secondary,
                                  fontSize: 11,
                                  fontFamily: theme.typography.fontFamily,
                                }}
                              />
                              <YAxis
                                allowDecimals={false}
                                tickLine={false}
                                axisLine={false}
                                tick={{
                                  fill: theme.palette.text.secondary,
                                  fontSize: 11,
                                  fontFamily: theme.typography.fontFamily,
                                }}
                              />
                              <RechartsTooltip {...chartTooltipProps} />
                              <Legend />
                              <Bar
                                dataKey="goals"
                                name={t('dashboard.common.matchDetail.goals')}
                                fill={INSIGHT_ACCENTS.goals.main}
                                radius={[4, 4, 0, 0]}
                              />
                              <Bar
                                dataKey="assists"
                                name={t('dashboard.common.matchDetail.assists')}
                                fill={INSIGHT_ACCENTS.assists.main}
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} lg={6}>
                <Card variant="outlined" sx={buildInsightSurfaceSx(theme, INSIGHT_ACCENTS.players)}>
                  <CardContent sx={buildInsightContentSx}>
                    <Stack spacing={1.25}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {t('dashboard.admin.standings.ratingDistributionTitle')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('dashboard.admin.standings.ratingDistributionDescription')}
                      </Typography>
                      {!ratingData.length && (
                        <Typography variant="body2" color="text.secondary">
                          {t('dashboard.admin.standings.insightsNoData')}
                        </Typography>
                      )}
                      {ratingData.length > 0 && (
                        <Box sx={buildInsightChartFrameSx(theme, INSIGHT_ACCENTS.players, 300)}>
                          <ResponsiveContainer>
                            <BarChart data={ratingData}>
                              <CartesianGrid
                                stroke={alpha(theme.palette.text.primary, isDark ? 0.12 : 0.08)}
                                strokeDasharray="3 3"
                              />
                              <XAxis
                                dataKey="label"
                                tickLine={false}
                                axisLine={{ stroke: alpha(theme.palette.text.primary, 0.12) }}
                                tick={{
                                  fill: theme.palette.text.secondary,
                                  fontSize: 11,
                                  fontFamily: theme.typography.fontFamily,
                                }}
                              />
                              <YAxis
                                allowDecimals={false}
                                tickLine={false}
                                axisLine={false}
                                tick={{
                                  fill: theme.palette.text.secondary,
                                  fontSize: 11,
                                  fontFamily: theme.typography.fontFamily,
                                }}
                              />
                              <RechartsTooltip {...chartTooltipProps} />
                              <Bar
                                dataKey="count"
                                name={t('dashboard.admin.standings.ratingDistributionCount')}
                                fill={INSIGHT_ACCENTS.players.main}
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {activeInsightTab === 'rankings' && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <LeadersCard
                  title={t('dashboard.admin.standings.leadersScorers')}
                  metricLabel={t('dashboard.common.matchDetail.goals')}
                  items={insightsReport.leaders.scorers}
                  metricKey="goals"
                  metricAccent={INSIGHT_ACCENTS.goals}
                  emptyText={t('dashboard.admin.standings.insightsNoData')}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <LeadersCard
                  title={t('dashboard.admin.standings.leadersAssisters')}
                  metricLabel={t('dashboard.common.matchDetail.assists')}
                  items={insightsReport.leaders.assisters}
                  metricKey="assists"
                  metricAccent={INSIGHT_ACCENTS.assists}
                  emptyText={t('dashboard.admin.standings.insightsNoData')}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <LeadersCard
                  title={t('dashboard.admin.standings.leadersSavers')}
                  metricLabel={t('dashboard.common.matchDetail.saves')}
                  items={insightsReport.leaders.savers}
                  metricKey="saves"
                  metricAccent={INSIGHT_ACCENTS.saves}
                  emptyText={t('dashboard.admin.standings.insightsNoData')}
                />
              </Grid>
            </Grid>
          )}
        </Stack>
      )}
    </Stack>
  )
}
