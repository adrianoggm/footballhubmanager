import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, Grid, Stack, Typography } from '@mui/material'
import { EmptyState } from '../common'
import InviteCodeDialog from './overview/InviteCodeDialog.jsx'
import NextMatchCard from './overview/NextMatchCard.jsx'
import OverviewDatacards from './overview/OverviewDatacards.jsx'
import PlayerRankingCard from './overview/PlayerRankingCard.jsx'
import QuickActions from './overview/QuickActions.jsx'
import RecentMatchesCard from './overview/RecentMatchesCard.jsx'
import StatCarousel from './overview/StatCarousel.jsx'

/**
 * Admin overview: invite-code generation, standings snapshot, and season-matches
 * snapshot. Extracted from the AdminDashboard monolith. Imported eagerly (not lazy)
 * because overview is the default landing section — keeping it in the main chunk
 * avoids a first-paint Suspense flash.
 *
 * The match-detail dialog itself stays in AdminDashboard; this section only triggers
 * it via `actions.onOpenMatchDetail`.
 */
export default function AdminOverviewSection({ state, actions, helpers }) {
  const {
    selectedSeasonGuid,
    tokenPayload,
    standings,
    overviewSeasonMatches,
    allSeasonMatches,
    overviewDatacards,
  } = state
  const { onOpenMatchDetail, onStandings } = actions
  const { t, formatDate, formatEpochSeconds } = helpers

  // Invite is a Quick Action now: generating a code sets `tokenPayload` upstream,
  // which pops the invite modal. Guard against re-opening for the same token on
  // remount/navigation by tracking the previous token value.
  const [inviteOpen, setInviteOpen] = useState(false)
  const prevToken = useRef(tokenPayload?.token)
  useEffect(() => {
    const token = tokenPayload?.token
    if (token && token !== prevToken.current) setInviteOpen(true)
    prevToken.current = token
  }, [tokenPayload])

  const nextMatch =
    [...overviewSeasonMatches]
      .filter((m) => String(m.status || '').toLowerCase() !== 'closed')
      .sort((a, b) => new Date(a.match_date) - new Date(b.match_date))[0] || null

  return (
    <Grid container spacing={2.5} sx={{ width: '100%' }}>
      <Grid item xs={12}>
        <OverviewDatacards cards={overviewDatacards} />
      </Grid>

      <InviteCodeDialog
        open={inviteOpen}
        payload={tokenPayload}
        onClose={() => setInviteOpen(false)}
        t={t}
        formatEpochSeconds={formatEpochSeconds}
      />

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">
                {t('dashboard.admin.overview.quickActionsTitle')}
              </Typography>
              <QuickActions actions={actions} t={t} />
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        {!selectedSeasonGuid ? (
          <Card>
            <CardContent>
              <EmptyState title={t('dashboard.admin.overview.selectSeasonToLoad')} dense />
            </CardContent>
          </Card>
        ) : (
          <StatCarousel standings={standings} allMatches={allSeasonMatches} t={t} />
        )}
      </Grid>

      <Grid item xs={12} md={4}>
        <NextMatchCard match={nextMatch} t={t} formatDate={formatDate} />
      </Grid>

      <Grid item xs={12} md={4}>
        <PlayerRankingCard standings={standings} t={t} onStandings={onStandings} />
      </Grid>

      <Grid item xs={12} md={4}>
        <RecentMatchesCard
          matches={overviewSeasonMatches}
          t={t}
          formatDate={formatDate}
          onOpenMatchDetail={onOpenMatchDetail}
        />
      </Grid>
    </Grid>
  )
}
