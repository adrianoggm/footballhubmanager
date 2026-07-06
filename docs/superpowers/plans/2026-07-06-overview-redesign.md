# Admin Overview Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the admin Overview section to match the issue #144 mockup — pruned datacards (moved off the shell into Overview only), a Quick Actions grid, a stat carousel, a next-match preview, a Top-5 ranking, and a recent-matches list — using only existing data and dependencies.

**Architecture:** `DashboardShell` stops rendering the `summaryCards` row (that removes the cards from every admin section). The datacards are re-rendered *inside* `AdminOverviewSection`, which is rewritten from a 3-card stack into the mockup layout. New blocks are small presentational components under `components/admin/overview/`, fed by data already loaded in `AdminDashboard` and passed through the existing `{state, actions, helpers}` bundle.

**Tech Stack:** React 18, MUI, `recharts` (already installed), Vite. No new dependencies.

## Global Constraints

- No new npm dependencies. Charts use `recharts`; UI uses MUI. (spec: "No new frontend dependencies")
- No backend changes, no new endpoints. All data comes from existing `AdminDashboard` state. (spec)
- All user-facing text goes in `frontend/src/i18n/messages.js` with **parallel EN + ES** blocks; interpolation uses `{var}`. (CLAUDE.md)
- Theme-agnostic styling: reuse `getDashboardGeometry(theme)` + `alpha()` patterns from `DashboardShell`/`StatCard` so all 6 themes inherit. No per-theme code. (spec)
- There is **no frontend test framework**. The verification gate for every task is `just frontend-check` (prettier --check + eslint + `vite build`), run from repo root. (CLAUDE.md)
- API/domain naming stays `pena`/GUID. (CLAUDE.md)
- User dashboard is out of scope. Only touch `AdminDashboard`, `AdminOverviewSection`, `DashboardShell` (additive), new overview components, and `messages.js`.

---

### Task 1: i18n strings for the new Overview

**Files:**
- Modify: `frontend/src/i18n/messages.js`

**Interfaces:**
- Produces: translation keys consumed by every later task, under `dashboard.admin.overview.*`. Exact keys defined below.

- [ ] **Step 1: Locate the existing overview block**

Open `frontend/src/i18n/messages.js`. Find the EN `dashboard.admin.overview` object and its ES counterpart (search `overview:` — there are two, one under the EN root, one under ES). New keys are added to **both** in the same shape.

- [ ] **Step 2: Add the new keys to the EN `overview` object**

Add these entries (keep existing ones like `inviteTitle`, `generateJoinCode`, `standingsSnapshotTitle`):

```js
// datacards
registeredPlayersCard: 'Registered Players',
registeredPlayersHelper: 'This season',
seasonMatchesCardLabel: 'Season Matches',
goalsScoredCard: 'Goals Scored',
topScorerCard: 'Top Scorer',
topScorerHelper: '{goals} goals',
noSeasonShort: 'No season',
// quick actions
quickActionsTitle: 'Quick Actions',
qaInviteTitle: 'Invite Players',
qaInviteDesc: 'Generate a join code',
qaAddPlayerTitle: 'Add Player',
qaAddPlayerDesc: 'Register a club member',
qaAddGuestTitle: 'Add Guest',
qaAddGuestDesc: 'Temporary trialist for today',
qaAddFundsTitle: 'Add Funds',
qaAddFundsDesc: 'Record dues or donations',
qaAddExpensesTitle: 'Add Expenses',
qaAddExpensesDesc: 'Log pitch or equipment costs',
qaStandingsTitle: 'Standings',
qaStandingsDesc: 'View and edit the league table',
// stat carousel
statsTitle: 'Season Stats',
statClassification: 'Classification',
statGoalsByMatchday: 'Goals by matchday',
statPlayersVsWins: 'Players vs victories',
carouselPrev: 'Previous stat',
carouselNext: 'Next stat',
matchdayShort: 'MD{n}',
axisGoals: 'Goals',
axisWins: 'Wins',
axisPlayed: 'Played',
// next match + rankings
nextMatchTitle: 'Next Match',
noUpcomingMatch: 'No upcoming match',
rankingTitle: 'Player Performance Ranking',
rankingTop: 'Top {n}',
rankingLineItem: '{played}P · {wins}W · {draws}D · {points} PTS',
recentMatchesTitle: 'Recent Matches',
recentMatchesLast: 'Last {n}',
viewFullHistory: 'View full history',
```

- [ ] **Step 3: Add the same keys to the ES `overview` object (parallel translations)**

```js
registeredPlayersCard: 'Jugadores inscritos',
registeredPlayersHelper: 'Esta temporada',
seasonMatchesCardLabel: 'Partidos de temporada',
goalsScoredCard: 'Goles marcados',
topScorerCard: 'Máximo goleador',
topScorerHelper: '{goals} goles',
noSeasonShort: 'Sin temporada',
quickActionsTitle: 'Acciones rápidas',
qaInviteTitle: 'Invitar jugadores',
qaInviteDesc: 'Genera un código de acceso',
qaAddPlayerTitle: 'Añadir jugador',
qaAddPlayerDesc: 'Registra a un miembro del club',
qaAddGuestTitle: 'Añadir invitado',
qaAddGuestDesc: 'Suplente puntual para hoy',
qaAddFundsTitle: 'Añadir ingresos',
qaAddFundsDesc: 'Registra cuotas o donaciones',
qaAddExpensesTitle: 'Añadir gastos',
qaAddExpensesDesc: 'Registra campo o material',
qaStandingsTitle: 'Clasificación',
qaStandingsDesc: 'Ver y editar la tabla',
statsTitle: 'Estadísticas de temporada',
statClassification: 'Clasificación',
statGoalsByMatchday: 'Goles por jornada',
statPlayersVsWins: 'Jugadores vs victorias',
carouselPrev: 'Anterior',
carouselNext: 'Siguiente',
matchdayShort: 'J{n}',
axisGoals: 'Goles',
axisWins: 'Victorias',
axisPlayed: 'Jugados',
nextMatchTitle: 'Próximo partido',
noUpcomingMatch: 'Sin próximo partido',
rankingTitle: 'Ranking de rendimiento',
rankingTop: 'Top {n}',
rankingLineItem: '{played}J · {wins}G · {draws}E · {points} PTS',
recentMatchesTitle: 'Partidos recientes',
recentMatchesLast: 'Últimos {n}',
viewFullHistory: 'Ver historial completo',
```

- [ ] **Step 4: Verify**

Run: `just frontend-check`
Expected: PASS (build succeeds; no eslint/prettier errors). If prettier complains, run `just frontend-fix` and re-run.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/i18n/messages.js
git commit -m "i18n(overview): strings for #144 dashboard redesign"
```

---

### Task 2: Move datacards off the shell into Overview

**Files:**
- Create: `frontend/src/components/admin/overview/OverviewDatacards.jsx`
- Modify: `frontend/src/components/dashboard/DashboardShell.jsx` (export `DashboardStatCard`)
- Modify: `frontend/src/components/AdminDashboard.jsx` (remove `summaryCards` from shell; pass datacard data into the overview bundle)
- Modify: `frontend/src/components/admin/AdminOverviewSection.jsx` (render `OverviewDatacards` at the top)

**Interfaces:**
- Consumes: `t` from helpers; datacard values from `AdminDashboard` state.
- Produces: `OverviewDatacards` default export — `function OverviewDatacards({ cards })` where `cards` is `Array<{ label, value, helper, tone }>` (same shape `DashboardStatCard` already expects).

- [ ] **Step 1: Export `DashboardStatCard` from the shell so Overview can reuse it**

In `frontend/src/components/dashboard/DashboardShell.jsx`, change the card component declaration from `function DashboardStatCard(` to `export function DashboardStatCard(` (line ~207). Leave everything else as-is.

- [ ] **Step 2: Create `OverviewDatacards.jsx`**

```jsx
import { Grid } from '@mui/material'
import { DashboardStatCard } from '../../dashboard/DashboardShell.jsx'

/**
 * The KPI datacard row. Previously rendered by DashboardShell on every section;
 * now rendered only here so the cards live on the Overview alone (issue #144).
 * `cards` items match the DashboardStatCard `item` shape: { label, value, helper, tone }.
 */
export default function OverviewDatacards({ cards = [] }) {
  if (!cards.length) return null
  return (
    <Grid container spacing={0.9}>
      {cards.map((item) => (
        <Grid key={item.label} item xs={12} sm={6} xl={3}>
          <DashboardStatCard item={item} />
        </Grid>
      ))}
    </Grid>
  )
}
```

- [ ] **Step 3: Build the datacard data in `AdminDashboard.jsx` and pass it to Overview**

In `AdminDashboard.jsx`, replace the `adminSummaryCards` array (lines ~1920-1959) with an `overviewDatacards` array of exactly four real-data cards. Compute `goalsScored` and `topScorer` from `standings` just above the array:

```js
const goalsScored = standings.reduce((sum, p) => sum + (p.goals ?? 0), 0)
const topScorer = standings.reduce(
  (best, p) => ((p.goals ?? 0) > (best?.goals ?? -1) ? p : best),
  null
)
const topScorerName = topScorer
  ? topScorer.nickname || `${topScorer.name} ${topScorer.surname1}`
  : '-'

const overviewDatacards = [
  {
    label: t('dashboard.admin.overview.registeredPlayersCard'),
    value: selectedSeasonGuid && !seasonRosterLoading ? String(seasonRoster.length) : '-',
    helper: t('dashboard.admin.overview.registeredPlayersHelper'),
    tone: 'info',
  },
  {
    label: t('dashboard.admin.overview.seasonMatchesCardLabel'),
    value:
      selectedSeasonGuid && !seasonMatchesLoading ? String(overviewMatchesSummary.total) : '-',
    helper: selectedSeason
      ? t('dashboard.admin.status.matchesOpenClosed', {
          open: overviewMatchesSummary.open,
          closed: overviewMatchesSummary.closed,
        })
      : t('dashboard.admin.status.noSeasonSelected'),
    tone: overviewMatchesSummary.open > 0 ? 'warning' : 'success',
  },
  {
    label: t('dashboard.admin.overview.goalsScoredCard'),
    value: selectedSeasonGuid ? String(goalsScored) : '-',
    helper: selectedSeason ? selectedSeasonLabel : t('dashboard.admin.overview.noSeasonShort'),
    tone: 'secondary',
  },
  {
    label: t('dashboard.admin.overview.topScorerCard'),
    value: selectedSeasonGuid && topScorer ? topScorerName : '-',
    helper: topScorer
      ? t('dashboard.admin.overview.topScorerHelper', { goals: topScorer.goals ?? 0 })
      : t('dashboard.admin.overview.noSeasonShort'),
    tone: 'success',
  },
]
```

Then:
- Remove `summaryCards={adminSummaryCards}` from the `<DashboardShell ...>` props (line ~2080). Removing the prop makes the shell render no card row (it defaults to `[]`), so cards vanish from every section.
- Add `overviewDatacards` to the Overview `state={{ ... }}` bundle (line ~2103).

- [ ] **Step 4: Render the datacards at the top of `AdminOverviewSection`**

In `AdminOverviewSection.jsx`, import the new component and destructure the data, then render it as the first child (before the invite card). Add to the top of the returned `<Grid container>`:

```jsx
import OverviewDatacards from './overview/OverviewDatacards.jsx'
// ...
const { overviewDatacards } = state
// inside the returned Grid, as the first item:
<Grid item xs={12}>
  <OverviewDatacards cards={overviewDatacards} />
</Grid>
```

- [ ] **Step 5: Verify cards render on Overview and are gone elsewhere**

Run: `just frontend-check`
Expected: PASS. Then start the app (`just db-up` + `just backend` + `just frontend`) and confirm: Overview shows 4 cards; Seasons/Players/Matches/Standings show none.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/admin/overview/OverviewDatacards.jsx frontend/src/components/dashboard/DashboardShell.jsx frontend/src/components/AdminDashboard.jsx frontend/src/components/admin/AdminOverviewSection.jsx
git commit -m "feat(overview): move datacards into Overview only (#144)"
```

---

### Task 3: Quick Actions grid

**Files:**
- Create: `frontend/src/components/admin/overview/QuickActions.jsx`
- Modify: `frontend/src/components/AdminDashboard.jsx` (thread guest + nav handlers into overview `actions`)
- Modify: `frontend/src/components/admin/AdminOverviewSection.jsx` (render `QuickActions`)

**Interfaces:**
- Consumes from overview `actions`: `onGenerateJoinCode` (exists), `onOpenMatchDetail` (exists), plus new `onAddPlayer`, `onAddGuest`, `onAddFunds`, `onAddExpenses`, `onStandings` — all `() => void`.
- Produces: `QuickActions` default export — `function QuickActions({ actions, t })`.

**ponytail note:** Full "preset modal" behavior (issue's long-term vision) is out of scope. `onAddPlayer`/`onAddFunds`/`onAddExpenses`/`onStandings` navigate to the owning section via `handleSectionChange`; `onAddGuest` calls the existing `handleCreateGuestPlayer`; invite generates the code inline. Upgrade to in-place modals when the modals are lifted to dashboard level.

- [ ] **Step 1: Create `QuickActions.jsx`**

```jsx
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
```

- [ ] **Step 2: Thread the new handlers into the overview `actions` bundle**

In `AdminDashboard.jsx`, the Overview `actions={{ ... }}` block (line ~2112) gains:

```js
onAddPlayer: () => handleSectionChange('players'),
onAddGuest: () => handleCreateGuestPlayer(true),
onAddFunds: () => handleSectionChange('accountability'),
onAddExpenses: () => handleSectionChange('accountability'),
onStandings: () => handleSectionChange('standings'),
```

(`handleCreateGuestPlayer` exists at line ~1503 and takes a `registerInSelectedSeason` boolean; `handleSectionChange` is already in scope.)

- [ ] **Step 3: Render `QuickActions` in the Overview**

In `AdminOverviewSection.jsx`, import `QuickActions`, wrap it in a titled `Card`, and place it after the datacards. Use `t('dashboard.admin.overview.quickActionsTitle')` as the heading. Pass `actions={actions}` and `t={t}`.

- [ ] **Step 4: Verify**

Run: `just frontend-check`
Expected: PASS. In the app, click each tile: Invite shows the code alert; Add Guest creates a guest; the rest navigate to their sections.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/admin/overview/QuickActions.jsx frontend/src/components/AdminDashboard.jsx frontend/src/components/admin/AdminOverviewSection.jsx
git commit -m "feat(overview): quick actions grid (#144)"
```

---

### Task 4: Stat carousel

**Files:**
- Create: `frontend/src/components/admin/overview/StatCarousel.jsx`
- Modify: `frontend/src/components/admin/AdminOverviewSection.jsx` (render `StatCarousel`, remove the old plain standings-snapshot table)

**Interfaces:**
- Consumes: `standings` (array with `nickname`/`name`/`surname1`, `played`, `wins`, `draws`, `losses`, `goals`, `points`), `overviewSeasonMatches` (array with `home_score`, `away_score`, `match_date`), `t`.
- Produces: `StatCarousel` default export — `function StatCarousel({ standings, matches, t })`.

- [ ] **Step 1: Create `StatCarousel.jsx` with three recharts views and a paging control**

```jsx
import { useMemo, useState } from 'react'
import { Box, Card, CardContent, IconButton, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'

const playerName = (p) => p.nickname || `${p.name} ${p.surname1}`
const played = (p) => p.played ?? p.wins + p.draws + p.losses

export default function StatCarousel({ standings = [], matches = [], t }) {
  const theme = useTheme()
  const accent = theme.palette.secondary.main
  const [index, setIndex] = useState(0)

  const classificationData = useMemo(
    () =>
      [...standings]
        .sort((a, b) => b.points - a.points)
        .slice(0, 8)
        .map((p) => ({ name: playerName(p), points: p.points })),
    [standings]
  )
  const goalsByMatchday = useMemo(
    () =>
      [...matches]
        .sort((a, b) => new Date(a.match_date) - new Date(b.match_date))
        .map((m, i) => ({
          md: t('dashboard.admin.overview.matchdayShort', { n: i + 1 }),
          goals: (m.home_score ?? 0) + (m.away_score ?? 0),
        })),
    [matches, t]
  )
  const playersVsWins = useMemo(
    () => standings.map((p) => ({ x: played(p), y: p.wins, z: p.points })),
    [standings]
  )

  const views = [
    { key: 'statClassification', chart: 'bar-classification' },
    { key: 'statGoalsByMatchday', chart: 'bar-goals' },
    { key: 'statPlayersVsWins', chart: 'scatter' },
  ]
  const view = views[index]
  const go = (delta) => setIndex((i) => (i + delta + views.length) % views.length)

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Typography variant="h6">{t(`dashboard.admin.overview.${view.key}`)}</Typography>
          <Stack direction="row" spacing={0.5}>
            <IconButton
              size="small"
              onClick={() => go(-1)}
              aria-label={t('dashboard.admin.overview.carouselPrev')}
            >
              ‹
            </IconButton>
            <IconButton
              size="small"
              onClick={() => go(1)}
              aria-label={t('dashboard.admin.overview.carouselNext')}
            >
              ›
            </IconButton>
          </Stack>
        </Stack>
        <Box sx={{ height: 240, mt: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            {view.chart === 'bar-classification' ? (
              <BarChart data={classificationData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} height={50} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip />
                <Bar dataKey="points" fill={accent} radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : view.chart === 'bar-goals' ? (
              <BarChart data={goalsByMatchday}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="md" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip />
                <Bar dataKey="goals" fill={accent} radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={t('dashboard.admin.overview.axisPlayed')}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={t('dashboard.admin.overview.axisWins')}
                  tick={{ fontSize: 11 }}
                />
                <ZAxis type="number" dataKey="z" range={[40, 200]} />
                <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={playersVsWins} fill={accent} />
              </ScatterChart>
            )}
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Render `StatCarousel` in the Overview and drop the old standings-snapshot table**

In `AdminOverviewSection.jsx`: import `StatCarousel`; render `<StatCarousel standings={standings} matches={overviewSeasonMatches} t={t} />` where the old standings-snapshot `Card` (the `standingsSnapshotTitle` block) was. Remove that old standings-snapshot `Card` and its now-unused `Table`/`onRefreshStandings` markup (the Top-5 ranking returns in Task 5). Keep the season-guard `EmptyState` when `!selectedSeasonGuid`.

- [ ] **Step 3: Verify**

Run: `just frontend-check`
Expected: PASS. In the app, the carousel renders and the ‹ › buttons cycle through classification → goals → scatter. If eslint flags unused imports from the removed table, delete them.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/admin/overview/StatCarousel.jsx frontend/src/components/admin/AdminOverviewSection.jsx
git commit -m "feat(overview): season stats carousel (#144)"
```

---

### Task 5: Next match, Top-5 ranking, recent matches row

**Files:**
- Create: `frontend/src/components/admin/overview/NextMatchCard.jsx`
- Create: `frontend/src/components/admin/overview/PlayerRankingCard.jsx`
- Create: `frontend/src/components/admin/overview/RecentMatchesCard.jsx`
- Modify: `frontend/src/components/admin/AdminOverviewSection.jsx` (render the row, remove old season-matches table)

**Interfaces:**
- Consumes: `overviewSeasonMatches` (each: `guid`, `match_date`, `home_team_name`, `away_team_name`, `home_score`, `away_score`, `status`), `standings`, `onOpenMatchDetail(guid)`, `onStandings`, `t`, `formatDate`.
- Produces: three default-export components: `NextMatchCard({ match, t, formatDate })`, `PlayerRankingCard({ standings, t, onStandings })`, `RecentMatchesCard({ matches, t, formatDate, onOpenMatchDetail })`.

- [ ] **Step 1: Create `NextMatchCard.jsx`**

```jsx
import { Card, CardContent, Stack, Typography } from '@mui/material'
import { EmptyState } from '../../common'

export default function NextMatchCard({ match, t, formatDate }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {t('dashboard.admin.overview.nextMatchTitle')}
        </Typography>
        {match ? (
          <Stack spacing={0.5} sx={{ mt: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {match.home_team_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              vs
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {match.away_team_name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {formatDate(match.match_date)}
            </Typography>
          </Stack>
        ) : (
          <EmptyState title={t('dashboard.admin.overview.noUpcomingMatch')} dense />
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create `PlayerRankingCard.jsx` (Top-5, hover expands the line)**

```jsx
import { Box, Button, Card, CardContent, Stack, Tooltip, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'

const playerName = (p) => p.nickname || `${p.name} ${p.surname1}`
const played = (p) => p.played ?? p.wins + p.draws + p.losses

export default function PlayerRankingCard({ standings = [], t, onStandings }) {
  const theme = useTheme()
  const top5 = [...standings].sort((a, b) => b.points - a.points).slice(0, 5)
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">{t('dashboard.admin.overview.rankingTitle')}</Typography>
          <Typography variant="caption" color="text.secondary">
            {t('dashboard.admin.overview.rankingTop', { n: 5 })}
          </Typography>
        </Stack>
        <Stack spacing={0.75} sx={{ mt: 1.5 }}>
          {top5.map((p, i) => (
            <Tooltip
              key={p.player_guid}
              title={t('dashboard.admin.overview.rankingLineItem', {
                played: played(p),
                wins: p.wins,
                draws: p.draws,
                points: p.points,
              })}
              placement="left"
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  px: 1,
                  py: 0.75,
                  borderRadius: 1,
                  '&:hover': { background: alpha(theme.palette.secondary.main, 0.08) },
                }}
              >
                <Typography variant="body2">
                  {i + 1}. {playerName(p)}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                  {t('dashboard.admin.overview.rankingLineItem', {
                    played: played(p),
                    wins: p.wins,
                    draws: p.draws,
                    points: p.points,
                  })}
                </Typography>
              </Box>
            </Tooltip>
          ))}
        </Stack>
        <Button variant="text" size="small" onClick={onStandings} sx={{ mt: 1 }}>
          {t('dashboard.admin.overview.qaStandingsTitle')}
        </Button>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Create `RecentMatchesCard.jsx` (last 3)**

```jsx
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material'
import { EmptyState } from '../../common'

export default function RecentMatchesCard({ matches = [], t, formatDate, onOpenMatchDetail }) {
  const recent = [...matches]
    .sort((a, b) => new Date(b.match_date) - new Date(a.match_date))
    .slice(0, 3)
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">{t('dashboard.admin.overview.recentMatchesTitle')}</Typography>
          <Typography variant="caption" color="text.secondary">
            {t('dashboard.admin.overview.recentMatchesLast', { n: 3 })}
          </Typography>
        </Stack>
        {recent.length ? (
          <Stack spacing={0.75} sx={{ mt: 1.5 }}>
            {recent.map((m) => (
              <Box
                key={m.guid}
                onClick={() => onOpenMatchDetail(m.guid)}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  px: 1,
                  py: 0.75,
                  borderRadius: 1,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                <Typography variant="body2" sx={{ minWidth: 0 }}>
                  {formatDate(m.match_date)} · {m.home_team_name} vs {m.away_team_name}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {m.home_score} - {m.away_score}
                </Typography>
              </Box>
            ))}
          </Stack>
        ) : (
          <EmptyState title={t('dashboard.admin.overview.noUpcomingMatch')} dense />
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Assemble the row and remove the old season-matches table**

In `AdminOverviewSection.jsx`: import the three components. Compute the next match:

```js
const nextMatch =
  [...overviewSeasonMatches]
    .filter((m) => String(m.status || '').toLowerCase() !== 'closed')
    .sort((a, b) => new Date(a.match_date) - new Date(b.match_date))[0] || null
```

Render a responsive 3-column row (`Grid` `xs={12} md={4}`) with `NextMatchCard`, `PlayerRankingCard`, `RecentMatchesCard`. Remove the old `seasonMatchesSnapshotTitle` `Card` (table + chips) — its data now lives in the datacards, carousel, and this row. Keep the invite card. Delete any imports left unused after removal (e.g. `Table*`, `Chip`).

- [ ] **Step 5: Verify**

Run: `just frontend-check`
Expected: PASS. In the app, the bottom row shows next match + top-5 (hover highlights each line) + recent 3 (clicking opens match detail).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/admin/overview/NextMatchCard.jsx frontend/src/components/admin/overview/PlayerRankingCard.jsx frontend/src/components/admin/overview/RecentMatchesCard.jsx frontend/src/components/admin/AdminOverviewSection.jsx
git commit -m "feat(overview): next match, ranking and recent matches row (#144)"
```

---

### Task 6: Final layout order + cleanup

**Files:**
- Modify: `frontend/src/components/admin/AdminOverviewSection.jsx`
- Modify: `frontend/src/components/AdminDashboard.jsx` (delete now-orphaned `adminSummaryCards` remnants / unused vars if any remain)

**Interfaces:** none new.

- [ ] **Step 1: Order the Overview top-to-bottom**

Confirm `AdminOverviewSection` renders, in order: (1) `OverviewDatacards`, (2) invite card, (3) `QuickActions` card, (4) `StatCarousel`, (5) the next-match/ranking/recent row. Wrap each in its own `<Grid item xs={12}>` inside the existing `<Grid container spacing={2.5}>`. Keep the `!selectedSeasonGuid` guards where a block needs a season.

- [ ] **Step 2: Remove dead code**

Search `AdminDashboard.jsx` for leftover references to `adminSummaryCards`, `activeSeasonLabel` used only by the deleted card, etc. Remove anything now unused. Search `AdminOverviewSection.jsx` for unused imports and props (`onRefreshStandings`, `overviewMatchLoading`, `formatEpochSeconds` if no longer used) and drop them.

- [ ] **Step 3: Verify full gate**

Run: `just frontend-check`
Expected: PASS with no eslint unused-var warnings.

- [ ] **Step 4: Manual multi-theme check**

Start the app, switch between at least the default theme and one orange theme, and confirm the Overview renders cleanly (cards, carousel, row) in both, light and dark.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/admin/AdminOverviewSection.jsx frontend/src/components/AdminDashboard.jsx
git commit -m "chore(overview): final layout order and cleanup (#144)"
```

---

## Self-Review

- **Spec coverage:** datacards move+prune (Task 2) ✓; Active Season→Registered Players (Task 2) ✓; Quick Actions (Task 3) ✓; stat carousel with 3 agreed views (Task 4) ✓; next real match (Task 5) ✓; Top-5 ranking + hover (Task 5) ✓; recent matches (Task 5) ✓; remove cards from other sections (Task 2, shell prop removed) ✓; theme-agnostic (all tasks reuse tokens) ✓; no new deps (recharts/MUI only) ✓; user dashboard untouched ✓.
- **Placeholder scan:** no TBD/TODO; all code blocks concrete.
- **Type consistency:** `playerName`/`played` helpers defined identically in Task 4 and Task 5; `overviewDatacards` shape (`{label,value,helper,tone}`) matches `DashboardStatCard` `item`; handler names (`onAddPlayer`/`onAddGuest`/`onAddFunds`/`onAddExpenses`/`onStandings`) consistent between Task 3 producer and consumer.
- **Note:** `seasonMatchesLoading` is referenced in Task 2 Step 3 — confirm it exists in `AdminDashboard` state (it is used in the current `adminSummaryCards`); if the actual name differs, use the existing one.
