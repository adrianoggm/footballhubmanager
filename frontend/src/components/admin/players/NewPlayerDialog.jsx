import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  useTheme,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import {
  translateNationalityLabel,
  translatePositionLabel,
  translateRoleLabel,
} from '../../../i18n/labels.js'
import { getSurfaceGeometry } from '../../common/surfaceGeometry.js'

// Admin palette (issue #147) comes from theme.custom.surfaces/tones so the
// Player Directory follows the active preset (Ember keeps the warm look, #70).

/**
 * Controlled dialog wrapping the "create guest player" form previously inline
 * in AdminPlayersSection (issue #147, task 7). Purely presentational: all
 * field state lives in `guestForm`/`onGuestField` and both submit paths go
 * through `onCreate(addToSeason)` — the caller (task 8) owns the mutation.
 */
export default function NewPlayerDialog({
  open,
  onClose,
  guestForm,
  onGuestField,
  nationalities,
  roleOptions,
  positionOptions,
  onCreate,
  t,
}) {
  const theme = useTheme()
  const { surfaces, tones } = theme.custom
  const surface = surfaces.raised
  const textColor = tones.onRaised
  const accent = tones.accentStrong
  const geometry = getSurfaceGeometry(theme)

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
      <DialogTitle sx={{ color: textColor }}>{t('dashboard.admin.guest.title')}</DialogTitle>
      <DialogContent dividers sx={{ borderColor: alpha(textColor, 0.12) }}>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            label={t('dashboard.admin.guest.name')}
            value={guestForm.name}
            onChange={onGuestField('name')}
            fullWidth
          />
          <TextField
            label={t('dashboard.admin.guest.surname1')}
            value={guestForm.surname1}
            onChange={onGuestField('surname1')}
            fullWidth
          />
          <TextField
            label={t('dashboard.admin.guest.surname2')}
            value={guestForm.surname2}
            onChange={onGuestField('surname2')}
            fullWidth
          />
          {(nationalities || []).length > 0 ? (
            <TextField
              select
              label={t('dashboard.admin.guest.nationality')}
              value={guestForm.nationality}
              onChange={onGuestField('nationality')}
              fullWidth
            >
              {nationalities.map((nationality) => (
                <MenuItem key={nationality} value={nationality}>
                  {translateNationalityLabel(t, nationality)}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              label={t('dashboard.admin.guest.nationality')}
              value={guestForm.nationality}
              onChange={onGuestField('nationality')}
              fullWidth
            />
          )}
          <TextField
            label={t('dashboard.admin.guest.nickname')}
            value={guestForm.nickname}
            onChange={onGuestField('nickname')}
            fullWidth
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              select
              label={t('dashboard.admin.guest.role')}
              value={guestForm.role}
              onChange={onGuestField('role')}
              fullWidth
            >
              <MenuItem value="">{t('dashboard.admin.guest.roleNone')}</MenuItem>
              {(roleOptions || []).map((roleLabel) => (
                <MenuItem key={roleLabel} value={roleLabel}>
                  {translateRoleLabel(t, roleLabel)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={t('dashboard.admin.guest.position')}
              value={guestForm.position}
              onChange={onGuestField('position')}
              fullWidth
            >
              <MenuItem value="">{t('dashboard.admin.guest.positionNone')}</MenuItem>
              {(positionOptions || []).map((positionLabel) => (
                <MenuItem key={positionLabel} value={positionLabel}>
                  {translatePositionLabel(t, positionLabel)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: textColor }}>
          {t('dashboard.common.matchDetail.closeAction')}
        </Button>
        <Button
          variant="outlined"
          onClick={() => onCreate(false)}
          sx={{ color: accent, borderColor: accent }}
        >
          {t('dashboard.admin.guest.createGuest')}
        </Button>
        <Button variant="contained" onClick={() => onCreate(true)} sx={accentButtonSx}>
          {t('dashboard.admin.guest.createAndAdd')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
