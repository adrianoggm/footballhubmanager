import { Alert, Button, Chip, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n/useI18n.js'
import { isValidEmail, normalizeEmail } from '../../services/accountEmailHelpers.js'

/**
 * Email block for the admin and user settings dialogs: set/change the address and
 * re-send the verification link. Saves on its own button, independently of the
 * dialog's profile save.
 */
export default function AccountEmailSettings({ accountEmail }) {
  const { t } = useI18n()
  const { email, verified, loading, saving, error, info } = accountEmail
  const [draft, setDraft] = useState(email)

  useEffect(() => {
    setDraft(email)
  }, [email])

  const normalizedDraft = normalizeEmail(draft)
  const draftChanged = normalizedDraft !== email
  const draftInvalid = draft !== '' && !isValidEmail(draft)

  const statusChip = !email ? (
    <Chip size="small" color="warning" label={t('accountEmail.statusMissing')} />
  ) : verified ? (
    <Chip size="small" color="success" label={t('accountEmail.statusVerified')} />
  ) : (
    <Chip size="small" color="info" label={t('accountEmail.statusUnverified')} />
  )

  return (
    <Stack spacing={1.25}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {t('accountEmail.title')}
        </Typography>
        {!loading && statusChip}
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {t('accountEmail.hint')}
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'flex-start' }}>
        <TextField
          size="small"
          type="email"
          autoComplete="email"
          label={t('accountEmail.label')}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          error={draftInvalid}
          helperText={draftInvalid ? t('accountEmail.errors.invalidEmail') : ' '}
          disabled={loading || saving}
          fullWidth
        />
        <Button
          variant="outlined"
          onClick={() => accountEmail.changeEmail(normalizedDraft)}
          disabled={loading || saving || !draftChanged || !isValidEmail(draft)}
          sx={{ flexShrink: 0 }}
        >
          {t('accountEmail.save')}
        </Button>
      </Stack>
      {email && !verified && (
        <Button
          size="small"
          variant="text"
          onClick={() => accountEmail.resendVerification()}
          disabled={saving}
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('accountEmail.resend')}
        </Button>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {!error && info && <Alert severity="success">{info}</Alert>}
    </Stack>
  )
}
