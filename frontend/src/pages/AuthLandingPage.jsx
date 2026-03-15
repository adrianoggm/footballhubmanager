import { Box, Chip, Grid, Paper, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import AuthPanel from '../components/AuthPanel.jsx'
import { useI18n } from '../i18n/useI18n.js'

function OverviewStatCard({ title, body, accent }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        minHeight: '100%',
        borderRadius: 4,
        border: `1px solid ${alpha('#0f172a', 0.08)}`,
        background: `linear-gradient(180deg, ${alpha('#ffffff', 0.88)} 0%, ${alpha(
          accent,
          0.08
        )} 100%)`,
      }}
    >
      <Stack spacing={1}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {body}
        </Typography>
      </Stack>
    </Paper>
  )
}

export default function AuthLandingPage({ auth }) {
  const { t } = useI18n()

  return (
    <Grid container spacing={{ xs: 3, md: 4 }}>
      <Grid item xs={12} lg={4.5}>
        <Box sx={{ position: { lg: 'sticky' }, top: { lg: 24 } }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, md: 3 },
              borderRadius: 5,
              border: `1px solid ${alpha('#0f172a', 0.08)}`,
              background:
                'linear-gradient(160deg, rgba(255,255,255,0.86) 0%, rgba(231,244,240,0.78) 54%, rgba(255,244,229,0.82) 100%)',
              boxShadow: '0 24px 56px rgba(15, 23, 42, 0.12)',
            }}
          >
            <Stack spacing={2.5}>
              <Stack spacing={0.75}>
                <Typography
                  variant="overline"
                  sx={{ color: 'secondary.dark', fontWeight: 800, letterSpacing: 1.3 }}
                >
                  {t('app.auth.sectionTitle')}
                </Typography>
                <Typography variant="h3">{t('app.auth.welcome')}</Typography>
                <Typography variant="body1" color="text.secondary">
                  {t('app.auth.accessHint')}
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" color="secondary" label={t('app.overview.onboardingChip')} />
                <Chip size="small" variant="outlined" label={t('app.auth.sectionHint')} />
              </Stack>

              <AuthPanel auth={auth} />
            </Stack>
          </Paper>
        </Box>
      </Grid>

      <Grid item xs={12} lg={7.5}>
        <Stack spacing={2.5}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, md: 3.5 },
              borderRadius: 5,
              border: `1px solid ${alpha('#0f172a', 0.08)}`,
              background:
                'linear-gradient(145deg, rgba(255,255,255,0.92) 0%, rgba(230,245,239,0.82) 52%, rgba(255,241,225,0.86) 100%)',
              boxShadow: '0 24px 56px rgba(15, 23, 42, 0.12)',
            }}
          >
            <Stack spacing={2.25}>
              <Stack spacing={0.75}>
                <Typography
                  variant="overline"
                  sx={{ color: 'secondary.dark', fontWeight: 800, letterSpacing: 1.3 }}
                >
                  {t('app.overview.sectionTitle')}
                </Typography>
                <Typography variant="h2" sx={{ maxWidth: 840 }}>
                  {t('app.overview.hero')}
                </Typography>
                <Typography
                  variant="h6"
                  color="text.secondary"
                  sx={{ maxWidth: 760, fontWeight: 400 }}
                >
                  {t('app.overview.description')}
                </Typography>
              </Stack>

              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2.25, md: 2.75 },
                  borderRadius: 4,
                  position: 'relative',
                  overflow: 'hidden',
                  border: `1px solid ${alpha('#0f172a', 0.08)}`,
                  background:
                    'linear-gradient(140deg, rgba(27,39,64,0.96) 0%, rgba(17,94,89,0.94) 100%)',
                  color: 'common.white',
                }}
              >
                <Stack spacing={1.25}>
                  <Typography variant="h5" sx={{ color: 'inherit' }}>
                    {t('app.overview.todayTitle')}
                  </Typography>
                  <Typography variant="body1" sx={{ color: alpha('#ffffff', 0.78) }}>
                    {t('app.overview.todayBody')}
                  </Typography>
                </Stack>
              </Paper>
            </Stack>
          </Paper>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <OverviewStatCard
                title={t('app.overview.adminTitle')}
                body={t('app.overview.adminBody')}
                accent="#0f766e"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <OverviewStatCard
                title={t('app.overview.playerTitle')}
                body={t('app.overview.playerBody')}
                accent="#0284c7"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <OverviewStatCard
                title={t('app.overview.contextTitle')}
                body={t('app.overview.contextBody')}
                accent="#1b2740"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <OverviewStatCard
                title={t('app.overview.roadmapTitle')}
                body={t('app.overview.roadmapBody')}
                accent="#b7791f"
              />
            </Grid>
          </Grid>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, md: 3 },
              borderRadius: 5,
              border: `1px dashed ${alpha('#b7791f', 0.44)}`,
              backgroundColor: alpha('#fff4e5', 0.78),
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
