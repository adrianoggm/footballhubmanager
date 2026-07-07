<!-- Paste this into the GitHub PR for feature/overview-redesign-144 -->
<!-- Suggested title: feat(overview): redesign admin Overview to Ascua design system (#144) -->

## What & why

Redesign of the admin **Overview** to match the issue #144 mockup and the shared **design system**
(Ascua theme). Main changes:

- The **datacards** no longer render on every section — they now live on the Overview only
  (Registered Players, Season Matches, Goals Scored, Top Scorer).
- New **Quick Actions** grid (Invite / Add Player / Add Guest / Add Funds / Add Expenses / Standings).
- **Stats carousel** with 4 views: Classification (table), Goals by matchday (area),
  Player stats (sortable table + Total/Per-match toggle) and Win rate (bars).
- **Next Match** with roster, **Player Performance Ranking** (Top 5) and **Recent Matches History**
  (Last 3) restyled to the system; plus an **invite-code modal**.
- Design-system alignment: colors (`#FF6B00`, `#049EFF`, `#88736A`, peach accent `#DF9F80`),
  fonts (Hanken Grotesk / Inter / JetBrains Mono / IBM Plex Mono) and **Material Symbols** icons.
- Backend: `standings` now exposes `average_rating` (mean rating over closed matches) and `saves`
  per player, aggregated in the existing query (no schema change).

Closes #144

## Type
- [x] feat
- [ ] fix
- [ ] docs
- [ ] test
- [x] refactor / chore / perf / ci / build  <!-- + style -->

## Checklist
- [x] Backend gate passes: `just check` (format-check + lint + 758 unit tests) ✅
- [x] Frontend gate passes: `just frontend-check` (prettier + eslint + build) ✅
- [ ] DB schema changes — **N/A**: no schema change (`average_rating`/`saves` are aggregated from
      existing `team_player` columns).
- [x] User-facing text in `frontend/src/i18n/messages.js` in **both EN and ES**
- [ ] Tests added/updated — **pending**: no test added for the new `average_rating`/`saves`
      aggregation in standings (frontend has no test framework).
- [x] `pena`/GUID API contracts kept intact

## Notes for reviewers

- **No new dependencies**: `lucide-react` was tried and uninstalled; final icons are **Material
  Symbols** (Google Fonts import in `index.css`). Recharts already existed.
- **Backend**: `average_rating` averages only matches with `status = "closed"` (so a future/open
  match with rating 0 doesn't drag the mean down). `saves` is a sum. A repository test for both is
  recommended.
- **Data**: `saves` shows 0 in the demo environment because saves weren't seeded; real data fills it.
- **Screenshots**: design captures were added under `docs/` and `audit-screenshots/` (can be pruned).
- Scope: **admin** dashboard only; the user dashboard is out of scope (parity as a follow-up).
