import { Alert, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import PublicAuthCard from '../components/account/PublicAuthCard.jsx'
import { useI18n } from '../i18n/useI18n.js'
import { tokenErrorKey } from '../services/accountEmailHelpers.js'
import { authService } from '../services/authService.js'

/** Public `/verify-email/:token` page reached from the emailed verification link. */
export default function VerifyEmailPage({ auth }) {
  const { t } = useI18n()
  const { token } = useParams()
  const [state, setState] = useState({ status: 'verifying', error: '' })
  // Tokens are single-use: never submit twice (React StrictMode re-runs effects).
  const submittedToken = useRef(null)

  useEffect(() => {
    if (submittedToken.current === token) {
      return
    }
    submittedToken.current = token
    authService
      .verifyEmail(token)
      .then(() => setState({ status: 'verified', error: '' }))
      .catch((error) => setState({ status: 'failed', error: t(tokenErrorKey(error)) }))
  }, [token, t])

  const continuePath = auth?.session ? '/app' : '/auth'

  return (
    <PublicAuthCard title={t('accountEmail.verifyTitle')}>
      {state.status === 'verifying' && (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            {t('accountEmail.verifying')}
          </Typography>
        </Stack>
      )}
      {state.status === 'verified' && (
        <Alert severity="success">{t('accountEmail.verifiedDone')}</Alert>
      )}
      {state.status === 'failed' && (
        <Alert severity="error">
          {state.error} {t('accountEmail.verifyRetryHint')}
        </Alert>
      )}
      {state.status !== 'verifying' && (
        <Button component={RouterLink} to={continuePath} variant="contained">
          {t('accountEmail.continue')}
        </Button>
      )}
    </PublicAuthCard>
  )
}
