import { Box, Card, CardContent, Chip, Stack, Typography, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { EmptyState } from '../../common'

function MetaLine({ icon, children }) {
  const theme = useTheme()
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Box
        component="span"
        className="material-symbols-rounded"
        sx={{ fontSize: 18, color: theme.palette.text.secondary }}
      >
        {icon}
      </Box>
      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
        {children}
      </Typography>
    </Stack>
  )
}

function RosterRow({ label, labelColor, name, extra, chipBg }) {
  const chipSx = {
    bgcolor: chipBg,
    color: 'text.primary',
    fontWeight: 600,
    borderRadius: '4px',
  }
  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      <Typography
        sx={{
          minWidth: 64,
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: labelColor,
        }}
      >
        {label}
      </Typography>
      <Chip size="small" label={name} sx={chipSx} />
      {extra > 0 ? <Chip size="small" label={`+${extra}`} sx={chipSx} /> : null}
    </Stack>
  )
}

// ponytail: roster shows the two participants + a "+N" from the players count;
// real per-side lineups + venue come from a later backend iteration (placeholder venue).
export default function NextMatchCard({ match, t, formatDate }) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const accent = theme.palette.primary.main

  const homeChipBg = theme.palette.background.default
  const awayChipBg = isDark
    ? alpha(theme.palette.common.white, 0.06)
    : alpha(theme.palette.common.black, 0.06)

  return (
    <Card sx={{ height: '100%', backgroundColor: theme.palette.background.paper }}>
      <CardContent>
        <Chip
          size="small"
          label={t('dashboard.admin.overview.nextMatchTitle')}
          sx={{
            bgcolor: alpha(accent, 0.14),
            color: accent,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.62rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            borderRadius: '6px',
          }}
        />
        {match ? (
          <Stack spacing={1.75} sx={{ mt: 1.75 }}>
            <Stack spacing={0.25}>
              <Typography
                sx={{
                  fontFamily: '"Hanken Grotesk", sans-serif',
                  fontWeight: 800,
                  fontSize: '1.7rem',
                  lineHeight: 1.1,
                }}
              >
                {match.home_team_name}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                {t('dashboard.admin.overview.versus')}
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Hanken Grotesk", sans-serif',
                  fontWeight: 800,
                  fontSize: '1.7rem',
                  lineHeight: 1.1,
                }}
              >
                {match.away_team_name}
              </Typography>
            </Stack>

            <Stack spacing={0.5}>
              <MetaLine icon="calendar_today">{formatDate(match.match_date)}</MetaLine>
              <MetaLine icon="place">{t('dashboard.admin.overview.nextMatchPlace')}</MetaLine>
            </Stack>

            <Box>
              <Typography
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.62rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: theme.palette.text.secondary,
                  mb: 0.75,
                }}
              >
                {t('dashboard.admin.overview.matchRoster')}
              </Typography>
              <Stack spacing={0.75}>
                <RosterRow
                  label={t('dashboard.admin.overview.rosterHome')}
                  labelColor={accent}
                  name={match.home_team_name}
                  extra={(match.home_players || 1) - 1}
                  chipBg={homeChipBg}
                />
                <RosterRow
                  label={t('dashboard.admin.overview.rosterAway')}
                  labelColor={theme.palette.text.secondary}
                  name={match.away_team_name}
                  extra={(match.away_players || 1) - 1}
                  chipBg={awayChipBg}
                />
              </Stack>
            </Box>
          </Stack>
        ) : (
          <EmptyState title={t('dashboard.admin.overview.noUpcomingMatch')} dense />
        )}
      </CardContent>
    </Card>
  )
}
