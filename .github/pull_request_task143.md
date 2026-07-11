## What & why
This PR unifies, refactors, and cleans up the visual and data structure of the main panel header (`DashboardShell`) and its associated components (`PenaSeasonSelector`, language/theme switchers, and settings dialogs).

**Key Improvements:**
* **Dashboard Shell Organization:** Simplified the structure of the main header (`DashboardShell.jsx`) by removing redundancies, applying uniform icon conventions, and reorganizing how quick action buttons are displayed.
* **Header Season Context Fix:** Corrected season selectors and references to ensure that the active and selected season states are displayed clearly.
* **Settings Modal Reorganization:** Re-structured the appearance settings and user profile panels (`AppearanceSettings.jsx`, `UserProfileSettingsDialog.jsx`), moving controls (such as the new palette selector in i18n) into more logical, clean sections.
* **Stat Cards Component Unification:** Polished styles, spacing, and borders of dashboard overview cards (`QuickActions`, `NextMatchCard`, `PlayerRankingCard`, `RecentMatchesCard`, `StatCarousel`) to align them with the global `theme.js` design guidelines.

Closes #143

## Type
- [x] feat
- [ ] fix
- [ ] docs
- [ ] test
- [ ] refactor / chore / perf / ci / build

## Checklist
- [x] Backend gate passes: `just check` (format-check + lint + unit tests)
- [x] Frontend gate passes (if touched): `just frontend-check` (prettier + eslint + build)
- [ ] DB schema changes also added to `versioning/sql/actual.sql` **and** a new `versioning/sql/versions/vN.sql`
- [x] User-facing text added to `frontend/src/i18n/messages.js` in **both** EN and ES
- [x] Tests added/updated for the change
- [x] Kept `pena`/GUID API contracts intact (unless the task explicitly changes them)

## Notes for reviewers
* Added translation keys for "Palette" (`palette`) in English and Spanish translation resource bundles.
* Removed redundant badges that cluttered the header on medium screen sizes.
