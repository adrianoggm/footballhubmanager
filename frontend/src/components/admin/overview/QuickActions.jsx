import { ButtonBase, Grid, Stack, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'

function ActionTile({ title, desc, onClick, tone = 'primary' }) {
  const theme = useTheme()
  const accent = theme.palette[tone]?.main || theme.palette.primary.main
  const radius = theme.custom?.dashboard?.radius?.surface || '14px'
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        width: '100%',
        textAlign: 'left',
        justifyContent: 'flex-start',
        p: 1.5,
        borderRadius: radius,
        border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
        background: alpha(theme.palette.background.paper, 0.7),
        transition: 'transform 160ms ease, box-shadow 160ms ease',
        '&:hover': {
          transform: 'translateY(-1px)',
          borderColor: alpha(accent, 0.4),
          boxShadow: `0 10px 22px ${alpha(theme.palette.text.primary, 0.08)}`,
        },
      }}
    >
      <Stack spacing={0.4} sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: accent }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem' }}>
          {desc}
        </Typography>
      </Stack>
    </ButtonBase>
  )
}

export default function QuickActions({ actions, t }) {
  const tiles = [
    { key: 'invite', tone: 'secondary', onClick: actions.onGenerateJoinCode },
    { key: 'addPlayer', tone: 'primary', onClick: actions.onAddPlayer },
    { key: 'addGuest', tone: 'info', onClick: actions.onAddGuest },
    { key: 'addFunds', tone: 'success', onClick: actions.onAddFunds },
    { key: 'addExpenses', tone: 'warning', onClick: actions.onAddExpenses },
    { key: 'standings', tone: 'primary', onClick: actions.onStandings },
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
    <Grid container spacing={0.9}>
      {tiles.map((tile) => {
        const [titleKey, descKey] = labels[tile.key]
        return (
          <Grid key={tile.key} item xs={12} sm={6} lg={4}>
            <ActionTile
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
