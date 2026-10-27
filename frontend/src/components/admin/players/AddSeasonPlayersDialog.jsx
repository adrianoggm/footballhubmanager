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

// Admin palette (issue #147) comes from theme.custom.surfaces/tones so the
// Player Directory follows the active preset (Ember keeps the warm look, #70).

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
  const { surfaces, tones } = theme.custom
  const surface = surfaces.raised
  const textColor = tones.onRaised
  const muted = tones.muted
  const accent = tones.accentStrong
  const geometry = getSurfaceGeometry(theme)

  const options = availablePlayers || []
  const guids = selectedGuids || []
  const selectedPlayers = guids
    .map((guid) => options.find((player) => player.guid === guid))
    .filter(Boolean)

  const accentButtonSx = {
    backgroundImage: 'none',
    backgroundColor: accent,
    color: theme.palette.background.paper,
    boxShadow: 'none',
    '&:hover': {
      backgroundImage: 'none',
      backgroundColor: tones.accentHover,
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
        sx: { backgroundColor: surface, color: textColor, borderRadius: geometry.surfaceRadius },
      }}
    >
      <DialogTitle sx={{ color: textColor }}>{t('dashboard.admin.players.squadTitle')}</DialogTitle>
      <DialogContent dividers sx={{ borderColor: alpha(textColor, 0.12) }}>
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
          <Typography variant="body2" sx={{ color: muted }}>
            {t('dashboard.admin.players.registeredAvailable', {
              registered: registeredCount,
              available: availableCount,
            })}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: textColor }}>
          {t('dashboard.common.matchDetail.closeAction')}
        </Button>
        <Button variant="contained" onClick={onAdd} disabled={!guids.length} sx={accentButtonSx}>
          {t('dashboard.admin.players.addSelectedToSeason')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
