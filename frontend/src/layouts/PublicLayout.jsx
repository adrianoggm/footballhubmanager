import { Box, Container, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { Outlet } from 'react-router-dom'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'
import { useI18n } from '../i18n/useI18n.js'

export default function PublicLayout() {
  const { t } = useI18n()

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        py: { xs: 2.5, md: 3.5 },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.8), transparent)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 560,
          height: 560,
          borderRadius: '50%',
          right: -180,
          top: -220,
          background: 'radial-gradient(circle, rgba(15,118,110,0.24) 0%, rgba(15,118,110,0) 70%)',
          animation: 'floatOrb 16s ease-in-out infinite',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 520,
          height: 520,
          borderRadius: '50%',
          left: -220,
          bottom: -180,
          background: 'radial-gradient(circle, rgba(183,121,31,0.24) 0%, rgba(183,121,31,0) 70%)',
          animation: 'floatOrb 20s ease-in-out infinite reverse',
        }}
      />

      <Container maxWidth="xl" sx={{ position: 'relative' }}>
        <Stack spacing={3}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ sm: 'center' }}
            spacing={1.5}
            sx={{
              px: { xs: 0.5, md: 1 },
            }}
          >
            <Stack spacing={0.35}>
              <Typography
                variant="overline"
                sx={{ color: 'secondary.dark', fontWeight: 800, letterSpacing: 1.3 }}
              >
                {t('app.brand')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('app.overview.sectionHint')}
              </Typography>
            </Stack>

            <Box
              sx={{
                p: 0.5,
                borderRadius: 999,
                border: `1px solid ${alpha('#0f172a', 0.08)}`,
                bgcolor: alpha('#ffffff', 0.62),
                backdropFilter: 'blur(12px)',
              }}
            >
              <LanguageSwitcher />
            </Box>
          </Stack>

          <Outlet />
        </Stack>
      </Container>
    </Box>
  )
}
