import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { EmptyState } from '../../common'

function MetaLine({ icon, children }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Box
        component="span"
        className="material-symbols-rounded"
        sx={{ fontSize: 18, color: '#88736A' }}
      >
        {icon}
      </Box>
      <Typography variant="body2" sx={{ color: '#88736A' }}>
        {children}
      </Typography>
    </Stack>
  )
}

function RosterRow({ label, name, extra, chipSx }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      <Typography
        sx={{
          minWidth: 62,
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.62rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#88736A',
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
  const chipSx = {
    bgcolor: alpha(theme.palette.text.primary, 0.06),
    color: 'text.primary',
    fontWeight: 600,
    borderRadius: '8px',
  }
  return (
    <Card sx={{ height: '100%', backgroundColor: '#1E1E1E' }}>
      <CardContent>
        <Chip
          size="small"
          label={t('dashboard.admin.overview.nextMatchTitle')}
          sx={{
            bgcolor: alpha('#DF9F80', 0.14),
            color: '#DF9F80',
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
              <Typography variant="body2" sx={{ color: '#88736A' }}>
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
                  color: '#88736A',
                  mb: 0.75,
                }}
              >
                {t('dashboard.admin.overview.matchRoster')}
              </Typography>
              <Stack spacing={0.75}>
                <RosterRow
                  label={t('dashboard.admin.overview.rosterHome')}
                  name={match.home_team_name}
                  extra={(match.home_players || 1) - 1}
                  chipSx={chipSx}
                />
                <RosterRow
                  label={t('dashboard.admin.overview.rosterAway')}
                  name={match.away_team_name}
                  extra={(match.away_players || 1) - 1}
                  chipSx={chipSx}
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
