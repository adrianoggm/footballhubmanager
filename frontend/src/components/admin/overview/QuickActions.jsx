import { Box, ButtonBase, Grid, Stack, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'

// Material Symbols (Rounded) ligature names per action.
const ICONS = {
  invite: 'group_add',
  addPlayer: 'person_add',
  addGuest: 'emoji_people',
  addFunds: 'payments',
  addExpenses: 'receipt_long',
  standings: 'leaderboard',
}

function ActionTile({ icon, title, desc, onClick }) {
  const theme = useTheme()
  const accent = '#FCB491' // design-system peach accent for quick actions
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
        border: `1px solid ${alpha(theme.palette.text.primary, isDark ? 0.07 : 0.09)}`,
        backgroundColor: alpha(theme.palette.background.paper, isDark ? 0.55 : 0.7),
        transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: alpha(accent, 0.5),
          boxShadow: `0 12px 26px ${alpha(theme.palette.common.black, isDark ? 0.35 : 0.12)}`,
        },
      }}
    >
      <Stack spacing={1.1} sx={{ minWidth: 0 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: badgeRadius,
            display: 'grid',
            placeItems: 'center',
            color: accent,
            bgcolor: alpha(accent, isDark ? 0.16 : 0.12),
          }}
        >
          <Box
            component="span"
            className="material-symbols-rounded"
            sx={{
              fontSize: 24,
              fontVariationSettings: "'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24",
            }}
          >
            {icon}
          </Box>
        </Box>
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: '"Hanken Grotesk", sans-serif',
              fontWeight: 700,
              color: 'text.primary',
              fontSize: '1rem',
              lineHeight: 1.2,
            }}
          >
            {title}
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ fontSize: '0.8rem', lineHeight: 1.35, color: '#88736A' }}
          >
            {desc}
          </Typography>
        </Stack>
      </Stack>
    </ButtonBase>
  )
}

export default function QuickActions({ actions, t }) {
  // Uniform accent for all quick actions (design-system primary orange).
  const tiles = [
    { key: 'invite', onClick: actions.onGenerateJoinCode },
    { key: 'addPlayer', onClick: actions.onAddPlayer },
    { key: 'addGuest', onClick: actions.onAddGuest },
    { key: 'addFunds', onClick: actions.onAddFunds },
    { key: 'addExpenses', onClick: actions.onAddExpenses },
    { key: 'standings', onClick: actions.onStandings },
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
              icon={ICONS[tile.key]}
              title={t(`dashboard.admin.overview.${titleKey}`)}
              desc={t(`dashboard.admin.overview.${descKey}`)}
              onClick={tile.onClick}
            />
          </Grid>
        )
      })}
    </Grid>
  )
}
