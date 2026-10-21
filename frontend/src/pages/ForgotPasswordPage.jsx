import { Alert, Box, Button, Stack, TextField } from '@mui/material'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import PublicAuthCard from '../components/account/PublicAuthCard.jsx'
import { useI18n } from '../i18n/useI18n.js'
import { isValidEmail, normalizeEmail } from '../services/accountEmailHelpers.js'
import { authService } from '../services/authService.js'

/**
 * Public `/forgot-password` page. The backend answers the same way whether or not
 * the address has an account, so the page always shows the same confirmation.
 */
export default function ForgotPasswordPage() {
  const { language, t } = useI18n()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (!isValidEmail(email)) {
      setError(t('accountEmail.errors.invalidEmail'))
      return
    }
    setSubmitting(true)
    try {
      await authService.forgotPassword({ email: normalizeEmail(email), lang: language })
      setSent(true)
    } catch (requestError) {
      setError(
        requestError?.status === 429
          ? t('passwordRecovery.errors.tooManyRequests')
          : t('passwordRecovery.errors.generic')
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PublicAuthCard
      title={t('passwordRecovery.forgotTitle')}
      subtitle={t('passwordRecovery.forgotSubtitle')}
    >
      {sent ? (
        <Alert severity="success">{t('passwordRecovery.forgotSent')}</Alert>
      ) : (
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2}>
            <TextField
              label={t('accountEmail.label')}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              fullWidth
              required
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" disabled={submitting} fullWidth>
              {submitting ? t('passwordRecovery.sending') : t('passwordRecovery.forgotSubmit')}
            </Button>
          </Stack>
        </Box>
      )}
      <Button component={RouterLink} to="/auth" variant="text">
        {t('passwordRecovery.backToSignIn')}
      </Button>
    </PublicAuthCard>
  )
}
