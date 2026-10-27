import { Alert, Button, Container, Stack, Typography } from '@mui/material'
import { useI18n } from '../i18n/useI18n.js'

/**
 * Shown when the startup session check fails for a reason other than 401
 * (server/network down, rate limit): the user may still be signed in, so we
 * offer a retry instead of dropping them on the sign-in page.
 */
export default function SessionUnavailablePage({ onRetry }) {
  const { t } = useI18n()

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Stack spacing={2.5}>
        <Typography variant="h5">{t('app.brand')}</Typography>
        <Alert severity="warning">{t('app.sessionUnavailable')}</Alert>
        <Button variant="contained" onClick={onRetry} sx={{ width: 'fit-content' }}>
          {t('app.retry')}
        </Button>
      </Stack>
    </Container>
  )
}
