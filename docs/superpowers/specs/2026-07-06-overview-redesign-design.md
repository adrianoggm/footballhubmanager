# Admin Overview redesign (issue #144)

Date: 2026-07-06
Scope: full restyle + restructure of the **admin** Overview section to match the
proposed mockup, using only data/endpoints that already exist. No new backend,
no new frontend dependencies (`recharts` + MUI are already present).

## Goal

Turn the current thin Overview (invite-code card + standings table + season-matches
table) into the richer dashboard from the mockup: pruned datacards, a Quick Actions
grid, a stat carousel, a next-match preview, a Top-5 player ranking, and a recent
matches list.

## Key architectural fact

The 4 stat datacards are rendered by `DashboardShell` via the `summaryCards` prop
(`DashboardShell.jsx:797`). The shell wraps **every** section, which is why the cards
appear on every screen. `AdminDashboard.jsx:2080` and `UserDashboard.jsx:836` both
pass `summaryCards`.

## Decisions (locked)

1. **Datacards**: remove from every admin section except Overview. Drop "Active
   Season" card; replace with "Registered Players (this season)".
2. **Next match**: repurpose the mockup's "Next Internal Match" as the **next
   scheduled real match** from the existing season matches (real data). No internal
   Team-Alpha/Bravo concept is built.
3. **Stat carousel** (replaces "Attendance Consistency"): three views, all from
   existing data — season classification (standings), goals per matchday, players
   vs victories.
4. **User dashboard is out of scope** this iteration. The shell change is additive
   (Overview stops using the shell's `summaryCards`; the prop still works for the
   user side unchanged). Parity for the user side is a follow-up.

## Components & data mapping

All data is already loaded into `AdminDashboard` state and passed down through the
`{state, actions, helpers}` bundles that `AdminOverviewSection` already receives.

| Block | Source (existing) |
|---|---|
| Datacards | `seasonRoster.length`, `overviewMatchesSummary`, `standings` (goals/best perf) |
| Quick Actions | `handleGenerateJoinCode`, guest/player/expense handlers already in dashboard |
| Stat carousel | `standings` (classification, players-vs-wins), `overviewSeasonMatches` (goals/matchday) |
| Next match | `overviewSeasonMatches` — first upcoming/open match |
| Player ranking Top-5 | `standings.slice(0,5)` (`played·W·D·PTS`) |
| Recent matches | `overviewSeasonMatches` — last 3 by date |

### Layout (Overview section, top to bottom)

1. **Datacards row** — 4 cards. Reuses `DashboardStatCard` visuals; rendered inside
   the Overview section instead of the shell. Cards (all real data): Registered
   Players, Season Matches, Goals Scored (sum from standings), Top Scorer (max
   goals from standings). No fabricated "9.2 rating" card.
2. **Quick Actions grid** — 6 tiles (Invite, Add Player, Add Guest, Add Funds, Add
   Expenses, Standings). Each wired to the existing action/modal. Invite generates
   the code inline (as today). Standings is a nav/anchor to the standings section.
3. **Stat carousel** — one card, paginated (MUI, simple `useState` index + prev/next
   or dots). Three views built with `recharts`:
   - Season classification (mini standings)
   - Goals per matchday (bar chart over `overviewSeasonMatches`)
   - Players vs victories (correlation from `standings`)
4. **Next match + rankings row**:
   - Next scheduled match card (teams, date, place if present).
   - Player Performance Ranking (Top-5 from standings), with hover to expand roster
     detail where applicable.
   - Recent Matches History (last 3), each linking to match detail via existing
     `onOpenMatchDetail`.

## Files touched

- `frontend/src/components/admin/AdminOverviewSection.jsx` — rewritten to the new
  layout; renders datacards + quick actions + carousel + next-match/rankings row.
- `frontend/src/components/AdminDashboard.jsx` — stop passing `summaryCards` to the
  shell; pass the datacards data down to `AdminOverviewSection` instead. Adjust the
  swapped "Active Season → Registered Players" card. Thread any not-yet-threaded
  quick-action handlers (guest/expense) into the overview bundle.
- New small presentational components under
  `frontend/src/components/admin/overview/` to keep `AdminOverviewSection` focused:
  `OverviewDatacards.jsx`, `QuickActions.jsx`, `StatCarousel.jsx`,
  `NextMatchCard.jsx`, `PlayerRankingCard.jsx`, `RecentMatchesCard.jsx`.
- `frontend/src/i18n/messages.js` — new EN + ES strings for all new labels; remove
  the now-unused "Active Season" overview card string if orphaned.

## Theming

Build against the current (non-orange) theme. The 6 themes share `theme.custom`
geometry + palette tokens; reuse `getDashboardGeometry`/`alpha` patterns already in
`DashboardShell`/`StatCard` so all themes inherit. Orange themes are adapted by the
existing token system — no per-theme code.

## Non-goals / skipped (YAGNI)

- No attendance data / endpoint (deleted per issue).
- No internal-match backend (Team Alpha/Bravo).
- No user-dashboard changes this iteration.
- No new charting or carousel dependency — MUI + recharts only.

## Verification

No frontend test framework. Gate is `just frontend-check` (prettier + eslint +
`vite build`). Manually verify the Overview renders across a couple of themes and
that other admin sections no longer show the datacards.
