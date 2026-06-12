# Frontend Sitemap

This sitemap is the frontend source of truth for organizing features as the platform grows.
It is implemented in code at:

- `frontend/src/navigation/sitemap.js`

## 1) Shared Surface

- `/auth` Auth + product overview
  - Login / register
  - Language switch
  - Session handoff to role dashboards
- `/app`
  - Role-aware redirect to admin/user base route

## 2) Admin Surface

Admin navigation is section-based (tabbed in `AdminDashboard`), backed by `ADMIN_DASHBOARD_SITEMAP`.

- Base route: `/app/admin`
- Section routes:
  - `/app/admin/overview`
  - `/app/admin/seasons`
  - `/app/admin/players`
  - `/app/admin/matches`
  - `/app/admin/standings`
- `overview`
  - Current context, quick actions, snapshots
- `seasons`
  - Season configuration, active season lifecycle
- `players`
  - Squad, labels, memberships
- `matches`
  - Match lifecycle and detail workflows
- `standings`
  - Rankings and summary reads

### Admin section gating (no season / no players)

Some admin sections require prerequisites and are gated to prevent dead-end empty screens:

- Sections that require a season carry `requiresSeason: true` in `sitemap.js` (`matches`, `standings`).
- When the current peña has **no season**, those nav items render **disabled** (dimmed, with a
  "Create a season first" tooltip) and `handleSectionChange` redirects attempts to `seasons`.
- If a gated section is reached anyway (e.g. a deep link), it renders a guided `EmptyState`
  ("No season configured" → CTA to Seasons) instead of an empty/broken section.
- `accountability` is gated on **players** at render time (the player list is loaded on that
  section): with no players it shows an "Add players" `EmptyState` → CTA to Players.

Note: `seasons` and `players` are intentionally never gated — they are where the admin creates the
missing prerequisites. The `GET /seasons/active` 404 logged when no active season exists is the
backend's "no active season" signal and is handled by the client (→ null), not an error.

## 3) User Surface

User navigation is section-based with quick anchors, backed by `USER_DASHBOARD_SITEMAP`.

- Base route: `/app/user`
- Section routes:
  - `/app/user/join`
  - `/app/user/membership`
  - `/app/user/standings`
  - `/app/user/matches`
  - `/app/user/insights`
- `join` (`#user-section-join`)
  - Join by invite token
- `membership` (`#user-section-membership`)
  - My penas, membership updates
- `standings` (`#user-section-standings`)
  - Season ranking snapshot
- `matches` (`#user-section-matches`)
  - Match list and read-only details
- `insights` (`#user-section-insights`)
  - KPI and season comparison insights

## 3b) Global Context Bar (peña + season)

Both role dashboards share a single peña/season selector rendered in the dashboard header,
instead of each screen re-implementing it.

- Component: `frontend/src/components/dashboard/PenaSeasonSelector.jsx`
- State source: `frontend/src/context/dashboardContext.js` (`DashboardContext` + `useDashboardContext`)
- Each dashboard (`AdminDashboard`, `UserDashboard`) still owns the selection state and provides
  a context value (`penas`, `selectedPenaGuid`, `onSelectPena`, `seasons`, `selectedSeasonGuid`,
  `onSelectSeason`, `activeSeason`, role-specific `labels`). The selector and (in later phases)
  feature sections read it from context rather than via prop drilling.

Behavior:
- Changing the peña updates `selectedPenaGuid`; changing the season runs each role's own handler
  (admin resets dependent match/roster drafts via `applySeasonContext`; user simply re-selects).
- The season select is disabled until a peña is selected and seasons are loaded.
- When no peña is available/selected, the admin surface shows a guided `EmptyState`
  (`frontend/src/components/common/EmptyState.jsx`) with a refresh action instead of a bare alert.

When adding a section that depends on peña/season context, read it with `useDashboardContext()`
rather than threading new props through the dashboard.

Appearance + language preferences live in the **settings dialog** (peña settings for admin, profile
settings for user) via `frontend/src/components/dashboard/AppearanceSettings.jsx`, not in the header
toolbar. Language defaults to the browser language on first load (`I18nProvider.getInitialLanguage`
reads `navigator.language`); an explicit change in settings is persisted and then takes precedence.

## 4) Global Style Baseline

Global tokens and behavior are centralized in:

- `frontend/src/index.css` (CSS variables, smooth anchor navigation, reduced-motion support)
- `frontend/src/theme.js` (MUI palette/typography consuming global tokens)

## 5) How to Add a New Feature Section

1. Add or update the section definition in `frontend/src/navigation/sitemap.js`.
2. Render the section in the role dashboard (`AdminDashboard` or `UserDashboard`).
3. Ensure route normalization (default/invalid section behavior) in route pages under `frontend/src/pages/*RoutePage.jsx`.
4. If user-facing anchor navigation is needed, assign an anchor id and mark it as `data-sitemap-anchor`.
5. Add i18n labels in `frontend/src/i18n/messages.js`.
6. Validate with `npm --prefix frontend run check`.
