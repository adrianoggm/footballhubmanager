import { Box, Chip, Grid, Paper, Stack, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import AuthPanel from '../components/AuthPanel.jsx'
import { useI18n } from '../i18n/useI18n.js'

function OverviewStatCard({ title, body, accent }) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        minHeight: '100%',
        borderRadius: 4,
        border: `1px solid ${alpha(theme.palette.text.primary, isDark ? 0.12 : 0.08)}`,
        background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, isDark ? 0.94 : 0.88)} 0%, ${alpha(
          accent,
          isDark ? 0.14 : 0.08
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
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { t } = useI18n()

  return (
    <Grid container spacing={{ xs: 3, md: 4 }}>
      <Grid item xs={12} lg={5} xl={4}>
        <Box sx={{ position: { lg: 'sticky' }, top: { lg: 24 } }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, md: 3 },
              borderRadius: 5,
              border: `1px solid ${alpha(theme.palette.text.primary, isDark ? 0.12 : 0.08)}`,
              background: `linear-gradient(160deg, ${alpha(theme.palette.background.paper, isDark ? 0.94 : 0.86)} 0%, ${alpha(
                theme.palette.secondary.main,
                isDark ? 0.12 : 0.08
              )} 54%, ${alpha(theme.palette.warning.main, isDark ? 0.12 : 0.08)} 100%)`,
              boxShadow: isDark
                ? '0 24px 56px rgba(0, 0, 0, 0.28)'
                : '0 24px 56px rgba(15, 23, 42, 0.12)',
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

      <Grid item xs={12} lg={7} xl={8}>
        <Stack spacing={2.5}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, md: 3.5 },
              borderRadius: 5,
              border: `1px solid ${alpha(theme.palette.text.primary, isDark ? 0.12 : 0.08)}`,
              background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, isDark ? 0.96 : 0.92)} 0%, ${alpha(
                theme.palette.secondary.main,
                isDark ? 0.12 : 0.08
              )} 52%, ${alpha(theme.palette.warning.main, isDark ? 0.12 : 0.08)} 100%)`,
              boxShadow: isDark
                ? '0 24px 56px rgba(0, 0, 0, 0.28)'
                : '0 24px 56px rgba(15, 23, 42, 0.12)',
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
                  border: `1px solid ${alpha(theme.palette.text.primary, isDark ? 0.12 : 0.08)}`,
                  background: `linear-gradient(140deg, ${alpha(theme.palette.primary.main, isDark ? 0.42 : 0.96)} 0%, ${alpha(
                    theme.palette.secondary.dark,
                    isDark ? 0.56 : 0.94
                  )} 100%)`,
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
              border: `1px dashed ${alpha(theme.palette.warning.main, 0.44)}`,
              backgroundColor: alpha(
                isDark ? theme.palette.warning.main : '#fff4e5',
                isDark ? 0.12 : 0.78
              ),
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
