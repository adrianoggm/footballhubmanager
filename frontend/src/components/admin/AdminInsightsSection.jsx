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
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
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
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField
            select
            size="small"
            label={t('dashboard.admin.standings.insightsScopeLabel')}
            value={insightsScope}
            onChange={(event) => onInsightsScopeChange(event.target.value)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="selected_season">
              {t('dashboard.admin.standings.insightsScopeSelectedSeason')}
            </MenuItem>
            <MenuItem value="all_seasons">
              {t('dashboard.admin.standings.insightsScopeAllSeasons')}
            </MenuItem>
          </TextField>
          <Button
            variant="contained"
            onClick={onRefreshInsights}
            disabled={insightsLoading || !selectedSeasonGuid}
          >
            {t('dashboard.admin.standings.refreshInsights')}
          </Button>
        </Stack>
      </Stack>

      {insightsLoading && <LinearProgress />}

      {!insightsLoading && !insightsReport && (
        <Card
          variant="outlined"
          sx={buildInsightSurfaceSx(theme, INSIGHT_ACCENTS.matches, { dashed: true })}
        >
          <CardContent sx={buildInsightContentSx}>
            <Stack spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {t('dashboard.admin.standings.insightsEmpty')}
              </Typography>
              <Button
                variant="contained"
                onClick={onRefreshInsights}
                disabled={!selectedSeasonGuid}
              >
                {t('dashboard.admin.standings.refreshInsights')}
              </Button>
            </Stack>
          </CardContent>
        </Card>
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
          </Tabs>

          {activeInsightTab === 'trends' && (
            <Stack spacing={2.25}>
              <Grid container spacing={2}>
            <Grid item xs={12} lg={8}>
              <Card variant="outlined" sx={buildInsightSurfaceSx(theme, INSIGHT_ACCENTS.assists)}>
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
                  <TableContainer sx={buildInsightTableContainerSx(theme, INSIGHT_ACCENTS.players)}>
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
