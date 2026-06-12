import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
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
  Typography,
} from '@mui/material'
import { Suspense, lazy } from 'react'
import { translatePositionLabel, translateRoleLabel } from '../../i18n/labels.js'
import { DEFAULT_LABEL_COLOR } from '../../theme/tokens.js'

const AdminInsightsSection = lazy(() => import('./AdminInsightsSection.jsx'))

const renderFilterValue = (selected, emptyLabel, translate) => {
  const values = Array.isArray(selected)
    ? selected.map((item) => String(item || '').trim()).filter(Boolean)
    : []
  if (!values.length) {
    return emptyLabel
  }
  return (translate ? values.map(translate) : values).join(', ')
}

/**
 * Standings table + match insights for the selected season. Extracted from the
 * AdminDashboard monolith; receives its data/handlers via state/actions/helpers
 * bundles (the established admin-section prop convention) and lazy-loads the
 * insights sub-section so its recharts payload stays out of the main admin chunk.
 */
export default function AdminStandingsSection({ state, actions, helpers }) {
  const {
    selectedSeasonGuid,
    selectedSeasonLabel,
    loading,
    standings,
    standingsFilters,
    penaLabels,
    insightsScope,
    insightsLoading,
    insightsReport,
    insightsComparisonReport,
    insightsComparison,
  } = state
  const { onRefreshStandings, onStandingsFilterField, onInsightsScopeChange, onRefreshInsights } =
    actions
  const { t, formatDecimal, formatSignedDecimal, formatPercent } = helpers

  return (
    <Card sx={{ width: '100%' }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ sm: 'center' }}
            justifyContent="space-between"
            spacing={1.5}
          >
            <Box>
              <Typography variant="h6">{t('dashboard.admin.standings.title')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('dashboard.admin.standings.showingDataFor', { season: selectedSeasonLabel })}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              onClick={onRefreshStandings}
              disabled={loading || !selectedSeasonGuid}
            >
              {t('dashboard.admin.overview.refreshStandings')}
            </Button>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              select
              size="small"
              label={t('dashboard.admin.members.filterRole')}
              value={standingsFilters.role}
              onChange={onStandingsFilterField('role')}
              InputLabelProps={{ shrink: true }}
              SelectProps={{
                multiple: true,
                displayEmpty: true,
                renderValue: (selected) =>
                  renderFilterValue(selected, t('dashboard.admin.members.filterAllRoles'), (value) =>
                    translateRoleLabel(t, value)
                  ),
              }}
              fullWidth
            >
              {penaLabels.role_labels.map((roleLabel) => (
                <MenuItem key={roleLabel} value={roleLabel.toLowerCase()}>
                  {translateRoleLabel(t, roleLabel)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label={t('dashboard.admin.members.filterPosition')}
              value={standingsFilters.position}
              onChange={onStandingsFilterField('position')}
              InputLabelProps={{ shrink: true }}
              SelectProps={{
                multiple: true,
                displayEmpty: true,
                renderValue: (selected) =>
                  renderFilterValue(
                    selected,
                    t('dashboard.admin.members.filterAllPositions'),
                    (value) => translatePositionLabel(t, value)
                  ),
              }}
              fullWidth
            >
              {penaLabels.position_labels.map((positionLabel) => (
                <MenuItem key={positionLabel} value={positionLabel.toLowerCase()}>
                  {translatePositionLabel(t, positionLabel)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          {!selectedSeasonGuid && (
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.admin.standings.selectSeasonHeader')}
            </Typography>
          )}

          {selectedSeasonGuid && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('dashboard.admin.table.player')}</TableCell>
                    <TableCell>{t('dashboard.admin.members.role')}</TableCell>
                    <TableCell>{t('dashboard.admin.members.position')}</TableCell>
                    <TableCell align="right">{t('dashboard.admin.table.played')}</TableCell>
                    <TableCell align="right">{t('dashboard.admin.table.w')}</TableCell>
                    <TableCell align="right">{t('dashboard.admin.table.d')}</TableCell>
                    <TableCell align="right">{t('dashboard.admin.table.l')}</TableCell>
                    <TableCell align="right">{t('dashboard.admin.table.goals')}</TableCell>
                    <TableCell align="right">{t('dashboard.admin.table.assists')}</TableCell>
                    <TableCell align="right">{t('dashboard.admin.table.pts')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {standings.map((player) => (
                    <TableRow key={player.player_guid}>
                      <TableCell>{player.nickname || `${player.name} ${player.surname1}`}</TableCell>
                      <TableCell>
                        {player.role ? (
                          <Chip
                            size="small"
                            label={translateRoleLabel(t, player.role)}
                            sx={{
                              backgroundColor: player.role_color || DEFAULT_LABEL_COLOR,
                              color: '#fff',
                            }}
                          />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {player.position ? (
                          <Chip
                            size="small"
                            label={translatePositionLabel(t, player.position)}
                            sx={{
                              backgroundColor: player.position_color || DEFAULT_LABEL_COLOR,
                              color: '#fff',
                            }}
                          />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {player.played ?? player.wins + player.draws + player.losses}
                      </TableCell>
                      <TableCell align="right">{player.wins}</TableCell>
                      <TableCell align="right">{player.draws}</TableCell>
                      <TableCell align="right">{player.losses}</TableCell>
                      <TableCell align="right">{player.goals ?? 0}</TableCell>
                      <TableCell align="right">{player.assists ?? 0}</TableCell>
                      <TableCell align="right">{player.points}</TableCell>
                    </TableRow>
                  ))}
                  {!standings.length && (
                    <TableRow>
                      <TableCell colSpan={10}>
                        {t('dashboard.admin.standings.noSeasonPlayers')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Divider />
          <Suspense fallback={<LinearProgress />}>
            <AdminInsightsSection
              state={{
                selectedSeasonGuid,
                insightsScope,
                insightsLoading,
                insightsReport,
                insightsComparisonReport,
                insightsComparison,
              }}
              actions={{
                onInsightsScopeChange,
                onRefreshInsights,
              }}
              helpers={{
                t,
                formatDecimal,
                formatSignedDecimal,
                formatPercent,
              }}
            />
          </Suspense>
        </Stack>
      </CardContent>
    </Card>
  )
}
