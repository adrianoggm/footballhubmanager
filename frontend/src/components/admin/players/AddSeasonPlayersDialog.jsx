import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { getSurfaceGeometry } from '../../common/surfaceGeometry.js'

// Warm accountability palette (issue #147) — shared with StatCard / PlayerToolbar
// / PlayerList so the Player Directory dialogs read as the same system rather
// than inventing a new visual language.
const SURFACE = '#45342C'
const TEXT_COLOR = '#F4EEE8'
const MUTED = '#88736A'
const ACCENT = '#FCB491'

/**
 * Controlled dialog wrapping the "bulk add historical players to season" form
 * previously inline in AdminPlayersSection (issue #147, task 7). Purely
 * presentational: selection state is derived from `selectedGuids` and
 * reported upward via `onSelect`; the actual mutation happens in `onAdd`,
 * wired by the caller (task 8).
 */
export default function AddSeasonPlayersDialog({
  open,
  onClose,
  availablePlayers,
  selectedGuids,
  onSelect,
  onAdd,
  formatPlayerDisplayName,
  registeredCount,
  availableCount,
  t,
}) {
  const theme = useTheme()
  const geometry = getSurfaceGeometry(theme)

  const options = availablePlayers || []
  const guids = selectedGuids || []
  const selectedPlayers = guids
    .map((guid) => options.find((player) => player.guid === guid))
    .filter(Boolean)

  const accentButtonSx = {
    backgroundImage: 'none',
    backgroundColor: ACCENT,
    color: theme.palette.background.paper,
    boxShadow: 'none',
    '&:hover': {
      backgroundImage: 'none',
      backgroundColor: '#f2a074',
      boxShadow: theme.custom?.shadows?.md,
    },
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: { backgroundColor: SURFACE, color: TEXT_COLOR, borderRadius: geometry.surfaceRadius },
      }}
    >
      <DialogTitle sx={{ color: TEXT_COLOR }}>
        {t('dashboard.admin.players.squadTitle')}
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: alpha(TEXT_COLOR, 0.12) }}>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Autocomplete
            multiple
            disableCloseOnSelect
            options={options}
            value={selectedPlayers}
            onChange={(_event, nextPlayers) => onSelect(nextPlayers.map((player) => player.guid))}
            getOptionLabel={(option) => formatPlayerDisplayName(option)}
            isOptionEqualToValue={(option, value) => option.guid === value.guid}
            disabled={!options.length}
            filterSelectedOptions
            fullWidth
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('dashboard.admin.players.historicalMembersLabel')}
                helperText={
                  options.length
                    ? t('dashboard.admin.players.helperSome')
                    : t('dashboard.admin.players.helperNone')
                }
              />
            )}
          />
          <Typography variant="body2" sx={{ color: MUTED }}>
            {t('dashboard.admin.players.registeredAvailable', {
              registered: registeredCount,
              available: availableCount,
            })}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: TEXT_COLOR }}>
          {t('dashboard.common.matchDetail.closeAction')}
        </Button>
        <Button variant="contained" onClick={onAdd} disabled={!guids.length} sx={accentButtonSx}>
          {t('dashboard.admin.players.addSelectedToSeason')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
