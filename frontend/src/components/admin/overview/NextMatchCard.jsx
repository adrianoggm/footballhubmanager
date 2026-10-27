import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { EmptyState } from '../../common'

function MetaLine({ icon, children }) {
  const { tones } = useTheme().custom
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Box
        component="span"
        className="material-symbols-rounded"
        sx={{ fontSize: 18, color: tones.muted }}
      >
        {icon}
      </Box>
      <Typography variant="body2" sx={{ color: tones.muted }}>
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
  // home chip shares the warm Ranking/Recent surface; away is a darker, greyer tone
  const { surfaces, tones } = useTheme().custom
  return (
    <Card sx={{ height: '100%', backgroundColor: surfaces.card }}>
      <CardContent>
        <Chip
          size="small"
          label={t('dashboard.admin.overview.nextMatchTitle')}
          sx={{
            bgcolor: tones.accentSoftBg,
            color: tones.accent,
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
              <Typography variant="body2" sx={{ color: tones.muted }}>
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
                  color: tones.heading,
                  mb: 0.75,
                }}
              >
                {t('dashboard.admin.overview.matchRoster')}
              </Typography>
              <Stack spacing={0.75}>
                <RosterRow
                  label={t('dashboard.admin.overview.rosterHome')}
                  labelColor={tones.accent}
                  name={match.home_team_name}
                  extra={(match.home_players || 1) - 1}
                  chipBg={surfaces.chipHome}
                />
                <RosterRow
                  label={t('dashboard.admin.overview.rosterAway')}
                  labelColor={tones.muted}
                  name={match.away_team_name}
                  extra={(match.away_players || 1) - 1}
                  chipBg={surfaces.chipAway}
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
