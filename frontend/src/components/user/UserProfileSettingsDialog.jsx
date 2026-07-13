import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { translateNationalityLabel } from '../../i18n/labels.js'
import ProfileImageField from '../ProfileImageField.jsx'
import AppearanceSettings from '../dashboard/AppearanceSettings.jsx'

/**
 * User profile settings dialog: avatar, personal fields, nationality, and the
 * shared appearance/language preferences. Extracted from the UserDashboard
 * monolith; form state stays in the dashboard.
 */
export default function UserProfileSettingsDialog({
  open,
  onClose,
  onSave,
  loading,
  profileForm,
  onProfileField,
  onProfileImageChange,
  onProfileImageError,
  profileDisplayName,
  nationalities,
  t,
  penas = [],
  selectedPenaGuid = '',
  onSelectPena = () => {},
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('dashboard.user.profileSettingsTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.user.profileSettingsHint')}
          </Typography>
          {penas.length > 0 && (
            <TextField
              select
              size="small"
              label={t('dashboard.admin.currentPena') || 'Peña Activa'}
              value={selectedPenaGuid}
              onChange={(event) => onSelectPena(event.target.value)}
              disabled={loading}
              fullWidth
            >
              {penas.map((pena) => (
                <MenuItem key={pena.guid} value={pena.guid}>
                  {pena.name}
                </MenuItem>
              ))}
            </TextField>
          )}
          <ProfileImageField
            value={profileForm.image_url}
            alt={profileDisplayName || t('dashboard.user.profileSettingsTitle')}
            label={t('dashboard.common.profileImageLabel')}
            helperText={t('dashboard.user.profileImageHint')}
            chooseLabel={t('dashboard.common.imageActions.choose')}
            replaceLabel={t('dashboard.common.imageActions.replace')}
            removeLabel={t('dashboard.common.imageActions.remove')}
            emptyLabel={t('dashboard.common.imageEmpty')}
            processingLabel={t('dashboard.common.imageActions.processing')}
            disabled={loading}
            onChange={onProfileImageChange}
            onError={onProfileImageError}
          />
          <TextField
            label={t('dashboard.user.fields.name')}
            value={profileForm.name}
            onChange={onProfileField('name')}
          />
          <TextField
            label={t('dashboard.user.fields.surname1')}
            value={profileForm.surname1}
            onChange={onProfileField('surname1')}
          />
          <TextField
            label={t('dashboard.user.fields.surname2')}
            value={profileForm.surname2}
            onChange={onProfileField('surname2')}
          />
          <TextField
            select
            label={t('dashboard.user.fields.nationality')}
            value={profileForm.nationality}
            onChange={onProfileField('nationality')}
          >
            {nationalities.map((nationality) => (
              <MenuItem key={nationality} value={nationality}>
                {translateNationalityLabel(t, nationality)}
              </MenuItem>
            ))}
          </TextField>
          <Divider />
          <AppearanceSettings />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t('dashboard.user.settingsCancel')}
        </Button>
        <Button variant="contained" onClick={onSave} disabled={loading}>
          {t('dashboard.user.saveProfile')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
