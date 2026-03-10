import { Box, Chip, Grid, Paper, Stack, Typography } from '@mui/material'
import AuthPanel from '../components/AuthPanel.jsx'
import { useI18n } from '../i18n/useI18n.js'

export default function AuthLandingPage({ auth }) {
  const { t } = useI18n()

  return (
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
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 760, fontWeight: 400 }}>
            {t('app.overview.description')}
          </Typography>

          <Paper
            elevation={0}
            sx={{
              borderRadius: 4,
              p: { xs: 2.5, md: 3.5 },
              border: '1px solid rgba(31,41,55,0.1)',
              background:
                'linear-gradient(145deg, rgba(255,255,252,0.95) 0%, rgba(227,245,240,0.8) 56%, rgba(255,241,225,0.74) 100%)',
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
                  bgcolor: 'rgba(255,253,247,0.86)',
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
                  bgcolor: 'rgba(255,253,247,0.86)',
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
                  bgcolor: 'rgba(255,253,247,0.86)',
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
                  bgcolor: 'rgba(255,253,247,0.86)',
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
              bgcolor: 'rgba(255,246,230,0.72)',
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
  )
}
