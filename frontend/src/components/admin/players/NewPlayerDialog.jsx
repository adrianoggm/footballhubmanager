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

// Warm accountability palette (issue #147) — shared with StatCard / PlayerToolbar
// / PlayerList so the Player Directory dialogs read as the same system rather
// than inventing a new visual language.
const SURFACE = '#45342C'
const TEXT_COLOR = '#F4EEE8'
const ACCENT = '#FCB491'

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
  const geometry = getSurfaceGeometry(theme)

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
      <DialogTitle sx={{ color: TEXT_COLOR }}>{t('dashboard.admin.guest.title')}</DialogTitle>
      <DialogContent dividers sx={{ borderColor: alpha(TEXT_COLOR, 0.12) }}>
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
        <Button onClick={onClose} sx={{ color: TEXT_COLOR }}>
          {t('dashboard.common.matchDetail.closeAction')}
        </Button>
        <Button
          variant="outlined"
          onClick={() => onCreate(false)}
          sx={{ color: ACCENT, borderColor: ACCENT }}
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
