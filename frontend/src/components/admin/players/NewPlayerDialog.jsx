import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  useTheme,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useEffect, useState } from 'react'
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
 *
 * QA fixes: name and first surname are validated per field before submitting
 * (PL-11); a possible duplicate (`duplicateNames`) must be acknowledged before
 * creating (PL-06); there is no "no role" option because a membership always
 * has a role — the form is preset with the pena default role (PL-04).
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
  duplicateNames = [],
  t,
}) {
  const [submitted, setSubmitted] = useState(false)
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false)

  useEffect(() => {
    if (open) {
      setSubmitted(false)
      setDuplicateAcknowledged(false)
    }
  }, [open])

  const requiredError = (name) =>
    submitted && !String(guestForm[name] || '').trim()
      ? t('dashboard.admin.guest.requiredField')
      : ''
  const nameError = requiredError('name')
  const surname1Error = requiredError('surname1')
  const hasDuplicates = duplicateNames.length > 0
  const blockedByDuplicate = hasDuplicates && !duplicateAcknowledged

  const handleCreate = (addToSeason) => {
    setSubmitted(true)
    const missingRequired =
      !String(guestForm.name || '').trim() || !String(guestForm.surname1 || '').trim()
    if (missingRequired || blockedByDuplicate) {
      return
    }
    onCreate(addToSeason)
  }

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
      <DialogTitle sx={{ color: textColor }}>
        {t('dashboard.admin.guest.newPlayerTitle')}
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: alpha(textColor, 0.12) }}>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            label={t('dashboard.admin.guest.name')}
            value={guestForm.name}
            onChange={onGuestField('name')}
            required
            error={Boolean(nameError)}
            helperText={nameError || undefined}
            fullWidth
          />
          <TextField
            label={t('dashboard.admin.guest.surname1')}
            value={guestForm.surname1}
            onChange={onGuestField('surname1')}
            required
            error={Boolean(surname1Error)}
            helperText={surname1Error || undefined}
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
          {hasDuplicates && (
            <Alert severity="warning">
              {t('dashboard.admin.guest.duplicateWarning', { players: duplicateNames.join(', ') })}
              <FormControlLabel
                sx={{ display: 'flex', mt: 0.5 }}
                control={
                  <Checkbox
                    size="small"
                    checked={duplicateAcknowledged}
                    onChange={(event) => setDuplicateAcknowledged(event.target.checked)}
                  />
                }
                label={t('dashboard.admin.guest.duplicateConfirm')}
              />
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: textColor }}>
          {t('dashboard.common.matchDetail.closeAction')}
        </Button>
        <Button
          variant="outlined"
          onClick={() => handleCreate(false)}
          disabled={blockedByDuplicate}
          sx={{ color: accent, borderColor: accent }}
        >
          {t('dashboard.admin.guest.createGuest')}
        </Button>
        <Button
          variant="contained"
          onClick={() => handleCreate(true)}
          disabled={blockedByDuplicate}
          sx={accentButtonSx}
        >
          {t('dashboard.admin.guest.createAndAdd')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
