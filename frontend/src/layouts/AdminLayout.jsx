import { Box, Container, Stack, Typography } from '@mui/material'
import { Outlet } from 'react-router-dom'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'
import { useI18n } from '../i18n/useI18n.js'

export default function AdminLayout() {
  const { t } = useI18n()

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Stack spacing={4}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h3">{t('app.brand')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.admin.panelTitle')}
            </Typography>
          </Box>
          <LanguageSwitcher />
        </Stack>

        <Outlet />
      </Stack>
    </Container>
  )
}
