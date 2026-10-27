import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import PublicAuthCard from '../components/account/PublicAuthCard.jsx'
import { useI18n } from '../i18n/useI18n.js'
import { MIN_PASSWORD_LENGTH, tokenErrorKey } from '../services/accountEmailHelpers.js'
import { authService } from '../services/authService.js'

/**
 * Public `/reset-password/:token` page reached from the emailed link. Validates the
 * token first, then sets the new password. The backend revokes every session of
 * the account, so the user signs in again afterwards (no auto-login).
 */
export default function ResetPasswordPage() {
  const { t } = useI18n()
  const { token } = useParams()
  const [inspecting, setInspecting] = useState(true)
  const [info, setInfo] = useState(null)
  const [tokenError, setTokenError] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let active = true
    setInspecting(true)
    authService
      .inspectPasswordResetToken(token)
      .then((payload) => active && setInfo(payload))
      .catch((error) => active && setTokenError(t(tokenErrorKey(error))))
      .finally(() => active && setInspecting(false))
    return () => {
      active = false
    }
  }, [token, t])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    if (password.length < MIN_PASSWORD_LENGTH) {
      setSubmitError(t('auth.errors.passwordTooShort', { min: MIN_PASSWORD_LENGTH }))
      return
    }
    if (password !== confirmPassword) {
      setSubmitError(t('passwordRecovery.errors.passwordMismatch'))
      return
    }
    setSubmitting(true)
    try {
      await authService.resetPassword({ token, newPassword: password })
      setDone(true)
    } catch (error) {
      setSubmitError(t(tokenErrorKey(error)))
    } finally {
      setSubmitting(false)
    }
  }

  const accountTypeLabel =
    info?.account_type === 'admin' ? t('auth.roleAdmin') : t('auth.rolePlayer')

  return (
    <PublicAuthCard title={t('passwordRecovery.resetTitle')}>
      {inspecting && (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            {t('passwordRecovery.checkingLink')}
          </Typography>
        </Stack>
      )}

      {!inspecting && tokenError && (
        <>
          <Alert severity="error">{tokenError}</Alert>
          <Button component={RouterLink} to="/forgot-password" variant="outlined">
            {t('passwordRecovery.requestNewLink')}
          </Button>
        </>
      )}

      {!inspecting && info && done && (
        <>
          <Alert severity="success">{t('passwordRecovery.resetDone')}</Alert>
          <Button component={RouterLink} to="/auth" variant="contained">
            {t('passwordRecovery.backToSignIn')}
          </Button>
        </>
      )}

      {!inspecting && info && !done && (
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2}>
            <Alert severity="info">
              {t('passwordRecovery.resetFor', {
                username: info.username,
                accountType: accountTypeLabel,
              })}
            </Alert>
            <TextField
              label={t('passwordRecovery.newPassword')}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              helperText={t('auth.passwordHint')}
              fullWidth
              required
            />
            <TextField
              label={t('passwordRecovery.confirmPassword')}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              fullWidth
              required
            />
            {submitError && <Alert severity="error">{submitError}</Alert>}
            <Button type="submit" variant="contained" disabled={submitting} fullWidth>
              {submitting ? t('passwordRecovery.saving') : t('passwordRecovery.resetSubmit')}
            </Button>
          </Stack>
        </Box>
      )}
    </PublicAuthCard>
  )
}
