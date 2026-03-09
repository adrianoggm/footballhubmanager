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
