import { Alert, Button, Stack, Typography } from '@mui/material'
import { useI18n } from '../i18n/useI18n.js'

export default function SessionIncompletePage({ onLogout }) {
  const { t } = useI18n()

  return (
    <Stack spacing={2.5}>
      <Typography variant="h5">{t('app.brand')}</Typography>
      <Alert severity="warning">{t('app.sessionIncomplete')}</Alert>
      <Button variant="outlined" onClick={onLogout} sx={{ width: 'fit-content' }}>
        {t('dashboard.common.logout')}
      </Button>
    </Stack>
  )
}
