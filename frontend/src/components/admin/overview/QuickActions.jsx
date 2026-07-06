import { Box, ButtonBase, Grid, Stack, SvgIcon, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'

// Inline glyphs (no icon lib in the project — house style is inline SvgIcon).
const GLYPHS = {
  invite:
    'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  addPlayer:
    'M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  addGuest:
    'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  addFunds:
    'M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  addExpenses:
    'M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20z',
  standings: 'M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z',
}

function ActionTile({ glyph, title, desc, onClick, tone = 'primary' }) {
  const theme = useTheme()
  const accent = theme.palette[tone]?.main || theme.palette.primary.main
  const radius = theme.custom?.dashboard?.radius?.surface || '14px'
  const badgeRadius = theme.custom?.dashboard?.radius?.badge || '10px'
  const isDark = theme.palette.mode === 'dark'
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        width: '100%',
        height: '100%',
        textAlign: 'left',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        p: 1.75,
        borderRadius: radius,
        border: `1px solid ${alpha(theme.palette.text.primary, isDark ? 0.12 : 0.1)}`,
        background: `linear-gradient(160deg, ${alpha(accent, isDark ? 0.07 : 0.05)} 0%, ${alpha(
          theme.palette.background.paper,
          isDark ? 0.55 : 0.7
        )} 55%)`,
        transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: alpha(accent, 0.45),
          boxShadow: `0 12px 26px ${alpha(theme.palette.common.black, isDark ? 0.35 : 0.12)}`,
        },
      }}
    >
      <Stack spacing={1} sx={{ minWidth: 0 }}>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: badgeRadius,
            display: 'grid',
            placeItems: 'center',
            color: accent,
            bgcolor: alpha(accent, isDark ? 0.16 : 0.12),
            border: `1px solid ${alpha(accent, 0.24)}`,
          }}
        >
          <SvgIcon viewBox="0 0 24 24" sx={{ fontSize: 22 }}>
            <path d={glyph} fill="currentColor" />
          </SvgIcon>
        </Box>
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}
          >
            {title}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: '0.78rem', lineHeight: 1.3 }}
          >
            {desc}
          </Typography>
        </Stack>
      </Stack>
    </ButtonBase>
  )
}

export default function QuickActions({ actions, t }) {
  const tiles = [
    { key: 'invite', tone: 'secondary', glyph: GLYPHS.invite, onClick: actions.onGenerateJoinCode },
    { key: 'addPlayer', tone: 'info', glyph: GLYPHS.addPlayer, onClick: actions.onAddPlayer },
    { key: 'addGuest', tone: 'secondary', glyph: GLYPHS.addGuest, onClick: actions.onAddGuest },
    { key: 'addFunds', tone: 'success', glyph: GLYPHS.addFunds, onClick: actions.onAddFunds },
    {
      key: 'addExpenses',
      tone: 'warning',
      glyph: GLYPHS.addExpenses,
      onClick: actions.onAddExpenses,
    },
    { key: 'standings', tone: 'info', glyph: GLYPHS.standings, onClick: actions.onStandings },
  ]
  const labels = {
    invite: ['qaInviteTitle', 'qaInviteDesc'],
    addPlayer: ['qaAddPlayerTitle', 'qaAddPlayerDesc'],
    addGuest: ['qaAddGuestTitle', 'qaAddGuestDesc'],
    addFunds: ['qaAddFundsTitle', 'qaAddFundsDesc'],
    addExpenses: ['qaAddExpensesTitle', 'qaAddExpensesDesc'],
    standings: ['qaStandingsTitle', 'qaStandingsDesc'],
  }
  return (
    <Grid container spacing={1}>
      {tiles.map((tile) => {
        const [titleKey, descKey] = labels[tile.key]
        return (
          <Grid key={tile.key} item xs={12} sm={6} lg={4}>
            <ActionTile
              glyph={tile.glyph}
              title={t(`dashboard.admin.overview.${titleKey}`)}
              desc={t(`dashboard.admin.overview.${descKey}`)}
              tone={tile.tone}
              onClick={tile.onClick}
            />
          </Grid>
        )
      })}
    </Grid>
  )
}
