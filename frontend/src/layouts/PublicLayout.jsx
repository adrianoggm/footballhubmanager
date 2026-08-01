import { Box, Container, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { Outlet } from 'react-router-dom'
import AppFooter from '../components/common/AppFooter.jsx'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'
import ThemeModeSwitcher from '../components/ThemeModeSwitcher.jsx'
import { LogoHorizontal } from '../components/common'
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
          backgroundImage: (theme) =>
            `linear-gradient(${alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.06 : 0.04)} 1px, transparent 1px), linear-gradient(90deg, ${alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.06 : 0.04)} 1px, transparent 1px)`,
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

      <Container
        maxWidth={false}
        disableGutters
        sx={{ position: 'relative', px: { xs: 1.5, sm: 2, md: 2.5, lg: 3, xl: 4 } }}
      >
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
              <LogoHorizontal height={52} />
              <Typography variant="body2" color="text.secondary">
                {t('app.overview.sectionHint')}
              </Typography>
            </Stack>

            <Box
              sx={{
                p: 0.5,
                borderRadius: 999,
                border: (theme) => `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
                bgcolor: (theme) =>
                  alpha(
                    theme.palette.mode === 'dark'
                      ? theme.palette.background.default
                      : theme.palette.background.paper,
                    theme.palette.mode === 'dark' ? 0.74 : 0.62
                  ),
                backdropFilter: 'blur(12px)',
              }}
            >
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                <LanguageSwitcher />
                <ThemeModeSwitcher />
              </Stack>
            </Box>
          </Stack>

          <Outlet />

          <AppFooter />
        </Stack>
      </Container>
    </Box>
  )
}
