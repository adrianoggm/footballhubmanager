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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material'
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
  YAxis
} from 'recharts'

const INSIGHT_ACCENTS = {
  matches: {
    main: '#0ea5e9',
    soft: 'rgba(14, 165, 233, 0.12)',
    border: 'rgba(14, 165, 233, 0.34)'
  },
  seasons: {
    main: '#8b5cf6',
    soft: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(139, 92, 246, 0.34)'
  },
  players: {
    main: '#14b8a6',
    soft: 'rgba(20, 184, 166, 0.12)',
    border: 'rgba(20, 184, 166, 0.34)'
  },
  goals: {
    main: '#ef4444',
    soft: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.35)'
  },
  assists: {
    main: '#2563eb',
    soft: 'rgba(37, 99, 235, 0.12)',
    border: 'rgba(37, 99, 235, 0.35)'
  },
  saves: {
    main: '#f59e0b',
    soft: 'rgba(245, 158, 11, 0.14)',
    border: 'rgba(245, 158, 11, 0.4)'
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

const metricCardStyles = (accent) => ({
  borderRadius: 3,
  borderColor: accent.border,
  background: `linear-gradient(140deg, ${accent.soft} 0%, rgba(255,255,255,0.95) 100%)`
})

const buildMatrixCellSx = (cell, maxSharedMatches) => {
  if (cell.same_player) {
    return {
      backgroundColor: 'rgba(148, 163, 184, 0.16)',
      color: 'text.secondary',
      fontWeight: 700
    }
  }

  if (!cell.matches) {
    return {
      backgroundColor: 'rgba(148, 163, 184, 0.08)',
      color: 'text.secondary'
    }
  }

  const sharedRatio = maxSharedMatches > 0 ? cell.matches / maxSharedMatches : 0
  const hue = Math.round(8 + cell.win_rate * 120)
  const saturation = Math.round(35 + sharedRatio * 45)
  const lightness = Math.round(96 - sharedRatio * 28)

  return {
    backgroundColor: `hsl(${hue} ${saturation}% ${lightness}%)`,
    border: '1px solid rgba(15, 23, 42, 0.08)'
  }
}

const matrixLegend = [
  { key: 'low', rate: 0.3, matches: 0.25 },
  { key: 'mid', rate: 0.5, matches: 0.5 },
  { key: 'high', rate: 0.7, matches: 0.75 }
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
  fontWeight: 700
})

function InsightMetricCard({ label, value, accent = INSIGHT_ACCENTS.matches }) {
  return (
    <Card
      variant="outlined"
      sx={{
        ...metricCardStyles(accent),
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          backgroundColor: accent.main
        }
      }}
    >
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack spacing={0.35}>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.15 }}>
            {value}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}

function InsightRankingPanel({ title, emptyText, rows, t, matchLabelKey = 'dashboard.admin.table.played' }) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        background: 'linear-gradient(150deg, rgba(255,255,255,0.98) 0%, rgba(243,248,255,0.92) 100%)'
      }}
    >
      <CardContent>
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
                borderRadius: 2,
                border: '1px solid rgba(15, 23, 42, 0.08)',
                backgroundColor: 'rgba(255, 255, 255, 0.88)'
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
                      whiteSpace: 'nowrap'
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
                  <Chip size="small" variant="outlined" label={`${t(matchLabelKey)}: ${row.matches}`} />
                  <Chip size="small" color={getRateColor(row.rate)} label={row.rateLabel} />
                </Stack>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={Math.max(0, Math.min(100, Math.round(row.rate * 100)))}
                color={getRateColor(row.rate)}
                sx={{ borderRadius: 999, height: 8 }}
              />
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}

function LeadersCard({ title, metricLabel, items, metricKey, metricAccent, emptyText }) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        background: 'linear-gradient(160deg, rgba(255,255,255,0.98) 0%, rgba(244,250,246,0.92) 100%)'
      }}
    >
      <CardContent>
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
                borderBottom: index === items.length - 1 ? 'none' : '1px solid rgba(15, 23, 42, 0.08)'
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
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
                  fontWeight: 700
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
  const {
    selectedSeasonGuid,
    insightsScope,
    insightsLoading,
    insightsReport,
    insightsComparisonReport,
    insightsComparison
  } = state
  const { onInsightsScopeChange, onRefreshInsights } = actions
  const { t, formatDecimal, formatSignedDecimal, formatPercent } = helpers

  const maxSharedMatches = insightsReport?.matrix_rows?.reduce((maxValue, row) => {
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
    rateLabel: formatPercent(pair.win_rate)
  }))

  const teammateRows = (insightsReport?.top_teammates_by_player || []).slice(0, 10).map((item) => ({
    key: `${item.player_guid}-${item.partner_guid}`,
    title: item.player_label,
    subtitle: `${t('dashboard.admin.standings.bestTeammateColumn')}: ${item.partner_label}`,
    matches: item.matches,
    rate: item.win_rate,
    rateLabel: formatPercent(item.win_rate)
  }))

  const timelineMatchData = (insightsReport?.timeline_by_match || []).map((item) => ({
    ...item,
    x_label: item.match_date ? item.match_date.slice(5) : item.label
  }))

  const timelineSeasonData = (insightsReport?.timeline_by_season || []).map((item, index) => ({
    ...item,
    x_label: `S${index + 1}`,
    season_label: shortSeasonLabel(item.season_guid)
  }))

  return (
    <Stack spacing={2.25}>
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
          sx={{
            borderStyle: 'dashed',
            borderRadius: 3,
            background: 'linear-gradient(140deg, rgba(247,252,255,0.95) 0%, rgba(255,255,255,0.92) 100%)'
          }}
        >
          <CardContent>
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
            <Card
              variant="outlined"
              sx={{
                borderRadius: 3,
                background:
                  'linear-gradient(140deg, rgba(245,251,255,0.98) 0%, rgba(255,255,255,0.95) 100%)'
              }}
            >
              <CardContent>
                <Stack spacing={1.2}>
                  <Alert severity="info" sx={{ mb: 0, py: 0.6 }}>
                    {t('dashboard.admin.standings.insightsComparisonSummary', {
                      scope:
                        insightsScope === 'selected_season'
                          ? t('dashboard.admin.standings.insightsScopeAllSeasons')
                          : t('dashboard.admin.standings.insightsScopeSelectedSeason'),
                      goalsDelta: formatSignedDecimal(insightsComparison.goals_per_match_delta),
                      assistsDelta: formatSignedDecimal(insightsComparison.assists_per_match_delta),
                      savesDelta: formatSignedDecimal(insightsComparison.saves_per_match_delta)
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

          <Grid container spacing={2}>
            <Grid item xs={12} lg={8}>
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  background: 'linear-gradient(150deg, rgba(255,255,255,0.98) 0%, rgba(247,253,255,0.94) 100%)'
                }}
              >
                <CardContent>
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
                      <Box sx={{ width: '100%', height: 280 }}>
                        <ResponsiveContainer>
                          <LineChart data={timelineMatchData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="x_label" minTickGap={28} />
                            <YAxis allowDecimals={false} />
                            <RechartsTooltip
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
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  background: 'linear-gradient(155deg, rgba(255,255,255,0.98) 0%, rgba(250,255,250,0.93) 100%)'
                }}
              >
                <CardContent>
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
                      <Box sx={{ width: '100%', height: 280 }}>
                        <ResponsiveContainer>
                          <LineChart data={timelineMatchData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="x_label" minTickGap={30} />
                            <YAxis />
                            <RechartsTooltip
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

          <Card
            variant="outlined"
            sx={{
              borderRadius: 3,
              background: 'linear-gradient(155deg, rgba(255,255,255,0.98) 0%, rgba(255,252,246,0.93) 100%)'
            }}
          >
            <CardContent>
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
                  <Box sx={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <BarChart data={timelineSeasonData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="x_label" />
                        <YAxis />
                        <RechartsTooltip
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
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey="assists_per_match"
                          name={t('dashboard.admin.standings.insightsKpiAssistsPerMatch')}
                          fill={INSIGHT_ACCENTS.assists.main}
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey="saves_per_match"
                          name={t('dashboard.admin.standings.insightsKpiSavesPerMatch')}
                          fill={INSIGHT_ACCENTS.saves.main}
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>

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

          <Card
            variant="outlined"
            sx={{
              borderRadius: 3,
              background: 'linear-gradient(150deg, rgba(255,255,255,0.98) 0%, rgba(250,253,255,0.93) 100%)'
            }}
          >
            <CardContent>
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
                        { same_player: false, matches: Math.max(1, Math.round(maxSharedMatches * item.matches)), win_rate: item.rate },
                        maxSharedMatches || 1
                      )}
                      label={t(`dashboard.admin.standings.correlationLegend${item.key[0].toUpperCase()}${item.key.slice(1)}`)}
                    />
                  ))}
                </Stack>

                {!insightsReport.matrix_players.length && (
                  <Typography variant="body2" color="text.secondary">
                    {t('dashboard.admin.standings.insightsNoData')}
                  </Typography>
                )}

                {insightsReport.matrix_players.length > 0 && (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ minWidth: 220 }}>{t('dashboard.admin.table.player')}</TableCell>
                          {insightsReport.matrix_players.map((player) => (
                            <TableCell key={player.guid} align="center" sx={{ minWidth: 110 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  display: 'block',
                                  fontWeight: 700,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
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
                                  maxWidth: 250
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
                                        winRate: formatPercent(cell.win_rate)
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
                                    <Typography variant="caption">—</Typography>
                                  ) : cell.matches ? (
                                    <Stack spacing={0.2}>
                                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                        {formatPercent(cell.win_rate)}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {cell.matches}
                                      </Typography>
                                    </Stack>
                                  ) : (
                                    <Typography variant="caption" color="text.secondary">
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
        </Stack>
      )}
    </Stack>
  )
}
