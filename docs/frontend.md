# Frontend Guide

## Stack

- React 18
- Vite 7
- Material UI 5
- Recharts 2
- ESLint 9 + Prettier 3

## Product Surface

The frontend is a role-based application, not only an auth playground.

- Shared auth and onboarding flow for `admin` and `user`
- Admin dashboard for competition operations and analytics
- User dashboard for profile, membership, standings, match history, and insights
- Shared match detail viewer and insights visual components
- i18n support (`en` / `es`)

## Main Architecture

- App shell: `frontend/src/App.jsx`
- Router entry: `frontend/src/router/AppRouter.jsx`
- Route guards:
  - `frontend/src/router/guards/RequireAuth.jsx`
  - `frontend/src/router/guards/RequireGuest.jsx`
  - `frontend/src/router/guards/RequireRole.jsx`
- Layouts:
  - `frontend/src/layouts/PublicLayout.jsx`
  - `frontend/src/layouts/AdminLayout.jsx`
  - `frontend/src/layouts/UserLayout.jsx`
- Route feature pages:
  - `frontend/src/pages/admin/*.jsx`
  - `frontend/src/pages/user/*.jsx`
- Frontend sitemap source of truth: `frontend/src/navigation/sitemap.js`
- Auth and session state: `frontend/src/hooks/useAuth.js`
- Dashboards:
  - `frontend/src/components/AdminDashboard.jsx`
  - `frontend/src/components/UserDashboard.jsx`
- Admin feature sections (each takes `state` / `actions` / `helpers` prop bundles; all lazy-loaded
  except `AdminOverviewSection`, which is eager since it is the default landing section):
  - `frontend/src/components/admin/AdminOverviewSection.jsx` (invite code, standings + matches snapshots)
  - `frontend/src/components/admin/AdminSeasonsSection.jsx`
  - `frontend/src/components/admin/AdminAccountabilitySection.jsx`
  - `frontend/src/components/admin/AdminPlayersSection.jsx`
  - `frontend/src/components/admin/AdminMatchesSection.jsx` (thin composition of
    `admin/matches/`: `MatchCreateCard`, `MatchListCard`, `MatchEditorCard`, `trackingHelpers`)
  - `frontend/src/components/admin/AdminStandingsSection.jsx` (standings table + lazily nested `AdminInsightsSection`)
  - `frontend/src/components/admin/AdminInsightsSection.jsx`
- User feature sections (extracted from `UserDashboard`):
  - `frontend/src/components/user/UserJoinSection.jsx`
  - `frontend/src/components/user/UserMembershipSection.jsx`
  - `frontend/src/components/user/UserStandingsSection.jsx`
  - `frontend/src/components/user/UserMatchesSection.jsx`
  - `frontend/src/components/user/UserAccountabilitySection.jsx` (lazy)
- Shared dashboard context + selector + dialogs:
  - `frontend/src/context/dashboardContext.js`
  - `frontend/src/components/dashboard/PenaSeasonSelector.jsx`
  - `frontend/src/components/dashboard/MatchDetailDialog.jsx` (shared by admin overview + user matches)
  - `frontend/src/components/dashboard/AppearanceSettings.jsx` (theme + language, inside settings dialogs)
  - `frontend/src/components/user/UserProfileSettingsDialog.jsx`
  - `frontend/src/components/admin/PlayerEditDialogs.jsx`
- Shared UI primitives library:
  - `frontend/src/components/common/` (`EmptyState`, `ErrorState`, `LoadingState`, `ConfirmDialog`, `SectionHeader`, `StatCard`, `PaginatedTable`)
  - `frontend/src/components/common/AppFooter.jsx` — sitemap-driven page footer (about, navigation, rights), rendered by all three layouts
- Shared match viewer:
  - `frontend/src/components/MatchDetailViewer.jsx`

## Sitemap and Global Styles

- Sitemap reference document: `docs/frontend-sitemap.md`
- Global style tokens and browser-level rules:
  - `frontend/src/index.css`
- MUI theme mapped to global tokens:
  - `frontend/src/theme.js`
- User dashboard quick section navigation is driven by sitemap anchors for easier feature placement.

## Frontend Layers

- UI Components:
  - Dashboards, section components, dialogs, and tables.
- Hooks and state orchestration:
  - `useAuth`, `useAdminPlayers`, `useAdminSeasons`, `useAdminMatches`.
  - Shared async view-model hooks:
    - `useInsightsReport`
    - `useMatchDetailDialog`
- API services:
  - `authService`, `adminService`, `userService`, `httpClient`.
- Client session handling:
  - The session token lives only in an HttpOnly cookie set by the backend; JS never
    reads it. `httpClient` sends it automatically (`credentials: 'include'`,
    same-origin via ingress in prod and the vite proxy in dev).
  - `sessionStore` keeps only non-sensitive session metadata (role/guid) in memory and
    clears legacy localStorage token keys on startup/logout.
  - `useAuth` restores that metadata from `GET /api/v1/auth/session` on load, so a
    reload keeps the user signed in; it holds first paint while the check is in flight.
- Analytics helpers:
  - `matchInsights.js` (comparison helpers and view-level transformations).

## Functional Coverage

### Authentication

- Login/register for admin and user.
- Session persistence and logout.
- Nationality catalog loading in registration forms.

### Admin Dashboard

- Peña context selection.
- Season CRUD and active season management.
- Membership operations (guest creation, season registrations, stat updates).
- Match lifecycle:
  - Create detailed matches.
  - Update lineups.
  - Update match stats.
  - Read match detail.
  - Delete matches.
- Standings snapshot and season summary.
- Insights section (`AdminInsightsSection`, shared with the user dashboard):
  - Always-visible summary: KPI cards + season comparison deltas.
  - Tabbed heavy content (progressive disclosure — only one group mounts at a time):
    - `Trends`: timeline charts by match and by season (recharts renders only when this tab is open).
    - `Rankings`: top pairs / teammate rankings + leaders (goals, assists, saves).
    - `Matrix`: correlation heatmap matrix.

### User Dashboard

- Profile read/update.
- Join peña by token.
- Membership update and leave flow.
- Season selector with standings and full match history.
- Match detail viewer (read-only).
- Insights visualization parity with admin consumption.

## API Integration

All services consume backend v1 endpoints under `/api/v1`.

- Admin API: `frontend/src/services/adminService.js`
- User API: `frontend/src/services/userService.js`
- Auth API: `frontend/src/services/authService.js`
- HTTP transport and error normalization: `frontend/src/services/httpClient.js`

## Internationalization

- Provider: `frontend/src/i18n/I18nProvider.jsx`
- Message catalog: `frontend/src/i18n/messages.js`
- Hook: `frontend/src/i18n/useI18n.js`

## Build and Run

Install dependencies:

```bash
npm --prefix frontend install
```

Run dev server:

```bash
just run-frontend
```

Build production bundle:

```bash
npm --prefix frontend run build
```

Preview production build:

```bash
npm --prefix frontend run preview
```

## Lint and Format

Run frontend quality gate:

```bash
just frontend-check
```

Run commands individually:

```bash
just frontend-format-check
just frontend-lint
npm --prefix frontend run build
```

Auto-fix formatting/linting:

```bash
just frontend-format
just frontend-lint-fix
```

## Environment Variables

- `VITE_API_BASE_URL` (optional)
  - If set, API calls are prefixed with this base URL.
  - If unset, calls are relative (typically proxied by Vite in local dev).
