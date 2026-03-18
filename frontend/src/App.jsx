import { useAuth } from './hooks/useAuth.js'
import AppRouter from './router/AppRouter.jsx'

export default function App() {
  const auth = useAuth()

  const handleLogout = async () => {
    try {
      await auth.logout()
    } catch {
      // handled in auth state
    }
  }


  
  if (!isAuthenticated) {
    return (
      <Box
        sx={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', py: { xs: 3, md: 5 } }}
      >
        <Box
          sx={{
            position: 'absolute',
            width: 520,
            height: 520,
            borderRadius: '50%',
            right: -180,
            top: -200,
            background: 'radial-gradient(circle, rgba(15,118,110,0.3) 0%, rgba(15,118,110,0) 72%)',
            animation: 'floatOrb 16s ease-in-out infinite',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: 480,
            height: 480,
            borderRadius: '50%',
            left: -210,
            bottom: -180,
            background: 'radial-gradient(circle, rgba(180,83,9,0.24) 0%, rgba(180,83,9,0) 72%)',
            animation: 'floatOrb 20s ease-in-out infinite reverse',
          }}
        />

        <Container maxWidth="xl" sx={{ position: 'relative' }}>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
            <LanguageSwitcher />
          </Stack>
          <Grid container spacing={{ xs: 3, md: 5 }} alignItems="start">
            <Grid item xs={12} md={4}>
              <Box sx={{ position: { md: 'sticky' }, top: { md: 28 } }}>
                <Stack spacing={2.5}>
                  <Stack spacing={0.5}>
                    <Typography
                      variant="overline"
                      sx={{ color: 'secondary.dark', fontWeight: 800, letterSpacing: 1.2 }}
                    >
                      {t('app.auth.sectionTitle')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('app.auth.sectionHint')}
                    </Typography>
                  </Stack>
                  <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: -0.8 }}>
                    {t('app.auth.welcome')}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {t('app.auth.accessHint')}
                  </Typography>
                  <AuthPanel auth={auth} />
                </Stack>
              </Box>
            </Grid>

            <Grid item xs={12} md={8}>
              <Stack spacing={3}>
                <Stack spacing={0.5}>
                  <Typography
                    variant="overline"
                    sx={{ color: 'secondary.dark', fontWeight: 800, letterSpacing: 1.2 }}
                  >
                    {t('app.overview.sectionTitle')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('app.overview.sectionHint')}
                  </Typography>
                </Stack>
                <Typography
                  variant="h2"
                  sx={{ fontWeight: 800, lineHeight: 1.04, maxWidth: 860, letterSpacing: -1.8 }}
                >
                  {t('app.overview.hero')}
                </Typography>
                <Typography
                  variant="h6"
                  color="text.secondary"
                  sx={{ maxWidth: 760, fontWeight: 400 }}
                >
                  {t('app.overview.description')}
                </Typography>

                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: (theme) => theme.custom.radius.lg,
                    p: { xs: 2.5, md: 3.5 },
                    border: '1px solid rgba(15, 115, 255, 0.1)',
                    backgroundcolor: (theme) => theme.custom.gradients.cardDepth1,
                  }}
                >
                  <Stack spacing={1.5}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {t('app.overview.todayTitle')}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {t('app.overview.todayBody')}
                    </Typography>
                  </Stack>
                </Paper>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        minHeight: '100%',
                        border: '1px solid rgba(31,41,55,0.1)',
                        backgroundcolor: (theme) => theme.custom.gradients.cardDepth1,
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {t('app.overview.adminTitle')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                        {t('app.overview.adminBody')}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        minHeight: '100%',
                        border: '1px solid rgba(31,41,55,0.1)',
                        backgroundcolor: (theme) => theme.custom.gradients.cardDepth1,
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {t('app.overview.playerTitle')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                        {t('app.overview.playerBody')}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        minHeight: '100%',
                        border: '1px solid rgba(31,41,55,0.1)',
                        backgroundcolor: (theme) => theme.custom.gradients.cardDepth1,
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {t('app.overview.contextTitle')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                        {t('app.overview.contextBody')}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        minHeight: '100%',
                        border: '1px solid rgba(31,41,55,0.1)',
                        backgroundcolor: (theme) => theme.custom.gradients.cardDepth1,
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {t('app.overview.roadmapTitle')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                        {t('app.overview.roadmapBody')}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 4,
                    p: { xs: 2.5, md: 3 },
                    border: '1px dashed rgba(180,83,9,0.3)',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems="center">
                    <Chip label={t('app.overview.onboardingChip')} size="small" color="secondary" />
                    <Typography variant="body2" color="text.secondary">
                      {t('app.overview.onboardingBody')}
                    </Typography>
                  </Stack>
                </Paper>
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Stack spacing={4}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h3">{t('app.brand')}</Typography>
          </Box>
          <LanguageSwitcher />
        </Stack>

        {isAuthenticated && isAdmin && (
          <AdminDashboard session={auth.session} onLogout={handleLogout} />
        )}

        {isAuthenticated && isUser && (
          <UserDashboard session={auth.session} onLogout={handleLogout} />
        )}

        {isAuthenticated && !isAdmin && !isUser && (
          <Alert severity="warning">{t('app.sessionIncomplete')}</Alert>
        )}
      </Stack>
    </Container>
  )
}
