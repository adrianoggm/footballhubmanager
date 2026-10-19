import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Pagination,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useState } from 'react'
import { translatePositionLabel, translateRoleLabel } from '../../../i18n/labels.js'
import { readableTextColor } from '../../../theme/contrastText.js'
import { DEFAULT_LABEL_COLOR } from '../../../theme/tokens.js'
import { getSurfaceGeometry } from '../../common/surfaceGeometry.js'
import { isInSeason } from './playersHelpers.js'

// Warm accountability palette (issue #147) — shared with StatCard / PlayerToolbar
// so the Player Directory table reads as the same system rather than inventing
// a new visual language.
const SURFACE = '#45342C'
const TEXT_COLOR = '#F4EEE8'
const MUTED = '#88736A'
const ACCENT = '#FCB491'

const COLUMN_COUNT = 6

const labelChipSx = (color) => {
  const background = color || DEFAULT_LABEL_COLOR
  return {
    backgroundColor: background,
    color: readableTextColor(background),
    border: '1px solid rgba(15, 23, 42, 0.12)',
  }
}

const headerCellSx = {
  color: MUTED,
  fontFamily: '"JetBrains Mono", monospace',
  fontWeight: 700,
  fontSize: '0.72rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  borderColor: alpha(TEXT_COLOR, 0.12),
  whiteSpace: 'nowrap',
}

const bodyCellSx = {
  color: TEXT_COLOR,
  borderColor: alpha(TEXT_COLOR, 0.08),
}

// Build the per-row overflow menu items in the order/conditions the brief
// specifies. Keys are passed verbatim to `onRowAction(key, player)`.
function buildRowActions(player, inSeason, seasonSelected, t) {
  const actions = [{ key: 'edit', label: t('dashboard.admin.directory.rowActionEdit') }]

  if (inSeason) {
    actions.push({ key: 'editStats', label: t('dashboard.admin.directory.rowActionEditStats') })
    actions.push({
      key: 'removeFromSeason',
      label: t('dashboard.admin.directory.rowActionRemoveFromSeason'),
    })
  } else if (seasonSelected) {
    actions.push({
      key: 'addToSeason',
      label: t('dashboard.admin.directory.rowActionAddToSeason'),
    })
  }

  if (!player.has_account) {
    actions.push({ key: 'invite', label: t('dashboard.admin.directory.rowActionInvite') })
  }

  actions.push({
    key: 'remove',
    label: t('dashboard.admin.directory.rowActionRemove'),
    danger: true,
  })

  return actions
}

/**
 * Presentational, controlled Player Directory table (issue #147, task 6): one
 * row per pena member, season membership rendered as a STATUS column instead
 * of a second table. Receives already filtered/sorted/paged rows and reports
 * every interaction upward — it owns no data-fetching or filtering state.
 */
export default function PlayerList({
  pageItems,
  seasonRosterGuids,
  total,
  shown,
  page,
  pageCount,
  onPageChange,
  onAddToSeason,
  onRowAction,
  t,
  formatPlayerDisplayName,
  penaLabels,
  seasonSelected,
}) {
  const theme = useTheme()
  const geometry = getSurfaceGeometry(theme)
  const [menuState, setMenuState] = useState({ anchorEl: null, player: null })

  const roleColors = penaLabels?.role_colors || {}
  const positionColors = penaLabels?.position_colors || {}

  const openRowMenu = (event, player) => {
    setMenuState({ anchorEl: event.currentTarget, player })
  }

  const closeRowMenu = () => {
    setMenuState({ anchorEl: null, player: null })
  }

  const handleRowAction = (key, player) => {
    closeRowMenu()
    onRowAction(key, player)
  }

  const rows = pageItems || []

  return (
    <Card
      sx={{ backgroundColor: SURFACE, color: TEXT_COLOR, borderRadius: geometry.surfaceRadius }}
    >
      <CardContent>
        <Stack spacing={1.5}>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headerCellSx}>{t('dashboard.admin.table.player')}</TableCell>
                  <TableCell sx={headerCellSx}>{t('dashboard.admin.members.nickname')}</TableCell>
                  <TableCell sx={headerCellSx}>{t('dashboard.admin.members.role')}</TableCell>
                  <TableCell sx={headerCellSx}>{t('dashboard.admin.members.position')}</TableCell>
                  <TableCell sx={headerCellSx}>
                    {t('dashboard.admin.directory.filterStatus')}
                  </TableCell>
                  <TableCell sx={headerCellSx} align="right">
                    {t('dashboard.admin.members.actions')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!rows.length && (
                  <TableRow>
                    <TableCell colSpan={COLUMN_COUNT} align="center" sx={bodyCellSx}>
                      <Typography variant="body2" sx={{ color: MUTED }}>
                        {t('dashboard.admin.directory.empty')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}

                {rows.map((player) => {
                  const inSeason = isInSeason(player, seasonRosterGuids)

                  return (
                    <TableRow key={player.guid}>
                      <TableCell sx={bodyCellSx}>{formatPlayerDisplayName(player)}</TableCell>
                      <TableCell sx={{ ...bodyCellSx, color: ACCENT, fontStyle: 'italic' }}>
                        {player.nickname || '—'}
                      </TableCell>
                      <TableCell sx={bodyCellSx}>
                        {player.role ? (
                          <Chip
                            size="small"
                            label={translateRoleLabel(t, player.role)}
                            sx={labelChipSx(roleColors[player.role])}
                          />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell sx={bodyCellSx}>
                        {player.position ? (
                          <Chip
                            size="small"
                            label={translatePositionLabel(t, player.position)}
                            sx={labelChipSx(positionColors[player.position])}
                          />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell sx={bodyCellSx}>
                        {inSeason ? (
                          <Typography
                            variant="body2"
                            sx={{ color: theme.palette.success.main, fontWeight: 600 }}
                          >
                            {t('dashboard.admin.directory.statusActive')}
                          </Typography>
                        ) : seasonSelected ? (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => onAddToSeason(player)}
                            sx={{ color: ACCENT, borderColor: ACCENT }}
                          >
                            {t('dashboard.admin.directory.actionAddToSeason')}
                          </Button>
                        ) : (
                          <Typography variant="body2" sx={{ color: MUTED }}>
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={bodyCellSx} align="right">
                        <IconButton
                          size="small"
                          aria-label={t('dashboard.admin.members.actions')}
                          onClick={(event) => openRowMenu(event, player)}
                          sx={{ color: TEXT_COLOR }}
                        >
                          <Box component="span" className="material-symbols-rounded">
                            more_vert
                          </Box>
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Menu
            anchorEl={menuState.anchorEl}
            open={Boolean(menuState.anchorEl)}
            onClose={closeRowMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: {
                backgroundColor: SURFACE,
                color: TEXT_COLOR,
                borderRadius: geometry.surfaceRadiusTight,
                minWidth: 200,
              },
            }}
          >
            {menuState.player &&
              buildRowActions(
                menuState.player,
                isInSeason(menuState.player, seasonRosterGuids),
                seasonSelected,
                t
              ).map((action) => (
                <MenuItem
                  key={action.key}
                  onClick={() => handleRowAction(action.key, menuState.player)}
                  sx={action.danger ? { color: theme.palette.error.main } : undefined}
                >
                  {action.label}
                </MenuItem>
              ))}
          </Menu>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={1}
          >
            <Typography variant="caption" sx={{ color: MUTED }}>
              {t('dashboard.admin.directory.showingOfTotal', {
                shown: `${shown}`,
                total: `${total}`,
              })}
            </Typography>
            <Pagination
              size="small"
              count={pageCount}
              page={page}
              onChange={(_event, nextPage) => onPageChange(nextPage)}
              sx={{
                '& .MuiPaginationItem-root': { color: TEXT_COLOR },
                '& .MuiPaginationItem-root.Mui-selected': {
                  backgroundColor: ACCENT,
                  color: SURFACE,
                },
              }}
            />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}
