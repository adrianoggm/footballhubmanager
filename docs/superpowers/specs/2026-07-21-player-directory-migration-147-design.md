# Player Directory migration (issue #147) — design

**Date:** 2026-07-21
**Status:** Approved design, pending spec review → implementation plan
**Scope:** Frontend only. No backend/DB/API changes.

## Problem

The admin **Player Directory** view (`AdminPlayersSection`) has the same smell that
accountability had before its refactor: too much on screen at once. Concretely:

- **Two separate tables** — "Season Squad" (stats-heavy roster: Played/W/D/L/Goals/Assists/Pts)
  and "Pena Members" (identity + season-membership). Two lists is exactly the visual noise we
  want to remove.
- The season table duplicates a **scoreboard** that already lives in the Standings tabs.
  Removing it here is the right call.
- **Three always-visible forms** (create guest player, tag/label configuration, bulk
  "add to season" autocomplete) crowd the layout. Buttons that open modals are cleaner and free
  up space for a total-players stat.

The solution mirrors accountability: single list + filters, header buttons → modals, a stat card,
self-contained UI logic.

## Decisions (locked)

1. **Merge the two tables into ONE list.** Rows = pena members (`players`). Season membership
   becomes a **STATUS** column, not a second table. The stats scoreboard is removed from this view
   (it stays in Standings).
2. **Season stat editing is NOT lost.** The stats columns disappear, but per-season stats
   (W/D/L, quality level) remain editable via the row **⋮** action → existing edit modal.
3. **Stat card = total registered members** (`players.length`), label "Registered players".
   **No trend arrow** — there is no data source for "↑2" and we will not fabricate one
   (no backend change).
4. **Architecture: self-contained UI logic, central data.** Player UI state + mutations move into
   a `useAdminPlayers` hook instantiated in `AdminDashboard`. The hook still exposes `players` so
   sibling sections (accountability, overview) keep receiving it — **single central fetch, no
   duplication** (max leanness). The section receives a small prop surface + the hook bundle.
5. **Reuse-first.** Any component that is identical is reused, not duplicated (user directive:
   "componentes que sean iguales que se reutilicen").

## Architecture & file structure

New folder `frontend/src/components/admin/players/`, mirroring `accountability/`:

```
players/
  PlayerList.jsx              # the single table (modeled on TransactionLedger.jsx)
  PlayerToolbar.jsx           # search + Filters popover + Sort popover
  NewPlayerDialog.jsx         # modal wrapping the current guest-create form
  AddSeasonPlayersDialog.jsx  # modal wrapping the current bulk add-to-season autocomplete
  LabelsDialog.jsx            # modal — extract the currently-inline labels editor
  ClaimLinkDialog.jsx         # modal — extract the currently-inline claim-link dialog
  playersHelpers.js           # pure logic: status derivation, filter/sort/paginate, counts
  playersHelpers.test.js      # vitest, mirrors accountabilityHelpers.test.js
```

**Reused as-is (no new copies):**
- `frontend/src/components/common/ConfirmDialog.jsx` — destructive confirms (already used here).
- `frontend/src/components/admin/PlayerEditDialogs.jsx` — `EditSeasonPlayerDialog` +
  `EditMembershipDialog` (season stats + membership edit). Imported by the section.
- `frontend/src/components/common/` `LoadingState`; label helpers from `i18n/labels.js`;
  `surfaceGeometry` accessors.

**Promoted to shared (used by 2+ sections now):**
- `accountability/StatCard.jsx` → `common/StatCard.jsx`. Update accountability's import (1 line).
  No behavior change, no duplication.

**Hook (new):** `frontend/src/hooks/useAdminPlayers.js`
- Instantiated in `AdminDashboard.jsx`.
- Owns: `players` (all pena members), `seasonRoster`, `guestForm`, labels draft state,
  toolbar state (search/filters/sort/page), `claimLinkPayload`, loading flags, and every player
  mutation handler currently inlined in `AdminDashboard` (create guest, bulk add, single add,
  edit season stats, remove from season, edit membership, remove membership, claim link,
  save labels, loaders).
- Exposes `players` to `AdminDashboard` so it can keep passing it to accountability/overview.
- Exposes the rest as a bundle to `AdminPlayersSection`.
- This is a **faithful move** of already-working logic, not a rewrite — the goal is relocation +
  the new list/filter/derivation helpers, minimizing regression risk.

`AdminPlayersSection` becomes: `AdminPlayersSection({ penaGuid, selectedSeasonGuid,
selectedSeasonLabel, seasons, nationalities, penaLabels, t, formatPlayerDisplayName,
formatEpochSeconds, players... })` consuming the `useAdminPlayers` bundle. `AdminDashboard` drops
the 21-field state / 15-action prop bundle for players and any code that dies with it.

## Layout

```
Player Directory                                   (title + description)
[Add Season Players] [Add New Player] [Tag Configuration]     [ StatCard: REGISTERED  {players.length} ]
[🔍 Search players by name or nickname…]                          [Filters ▾]  [Sort ▾]
──────────────────────────── single table ────────────────────────────
Showing {shown} of {total} players registered                        ‹ 1 2 3 ›
```

- Header buttons are outlined with `material-symbols-rounded` icons (accountability style) and
  open modals.
- StatCard number = `players.length`; label localized "Registered players" / "Jugadores
  registrados".

## Single list data model

- **One row per pena member** (`players`). Season roster is no longer a separate list; it is
  derived: `inSeason = registeredSeasonPlayerGuids.has(player.guid)`.
- **Columns:** NAME · NICKNAME · ROLE (label chip) · POSITION (colored label chip) · STATUS ·
  ACTIONS(⋮).
- **STATUS:** `inSeason` → "Active" (green text). Not in season → inline **"Add to season"**
  button (`handleRegisterSinglePlayerInSeason`).
- **⋮ menu (context-dependent):**
  - Edit player (membership) → `EditMembershipDialog`.
  - Edit season stats — only if `inSeason` → `EditSeasonPlayerDialog`.
  - Add to season / Remove from season — toggles on `inSeason`.
  - Invite link — only if `!player.has_account` → `ClaimLinkDialog`.
  - Remove from peña → `ConfirmDialog`.
- **Toolbar:**
  - Search: matches name + nickname (case-insensitive).
  - Filters popover: role, position, status (in-season / not-in-season).
  - Sort popover: name A→Z (default) / Z→A.
- **Pagination:** client-side (players are already fully loaded — no backend). Page size 10.
  Footer "Showing {shown} of {total} players registered".

## Modals (wrap existing forms)

| Trigger | Modal | Source |
|---|---|---|
| Add New Player | `NewPlayerDialog` | current guest form (Create / Create + add to season) |
| Add Season Players | `AddSeasonPlayersDialog` | current bulk add-to-season autocomplete |
| Tag Configuration | `LabelsDialog` | current inline labels editor |
| ⋮ Edit | `PlayerEditDialogs` (reused) | already exists |
| ⋮ Invite link | `ClaimLinkDialog` | current inline claim-link dialog |
| ⋮ Remove | `common/ConfirmDialog` (reused) | already exists |

## Styling

Warm accountability palette: surfaces `#45342C`, text `#F4EEE8`, mono labels `#88736A`
("JetBrains Mono"), values "Hanken Grotesk", accent peach `#FCB491` on primary buttons,
`theme.custom.dashboard.radius` via `surfaceGeometry`, `material-symbols-rounded` icons.
Consistent with the just-restored overview.

## i18n

New keys in EN **and** ES (`dashboard.admin.*`): toolbar (search/filters/sort labels + options),
status ("Active"), "Showing {shown} of {total}", the three header button labels, stat-card label.
Reuse existing `players` / `members` / `guest` / `labels` strings where they already say the
same thing.

## Testing

`playersHelpers.test.js` (vitest, template = `accountabilityHelpers.test.js`) covering the pure
logic: `inSeason` status derivation, search/role/position/status filtering, name sort, client
pagination slicing, and counts. Frontend gate: prettier + eslint + `vite build`. (Confirm vitest
runs in this repo during implementation; helpers stay framework-free regardless.)

## Out of scope / YAGNI

- No trend/delta data (the "↑2"): dropped, no backend field invented.
- No server-side pagination: data is already loaded client-side.
- No backend, DB, or API contract changes.
- No changes to Standings/Matches (where the scoreboard now solely lives).
- No unrelated refactor of `AdminDashboard` beyond removing the player code that moves to the hook.

## Risks

- **Shared player data:** `players` is consumed by accountability (prop) and likely overview.
  Mitigation: the hook stays central in `AdminDashboard` and keeps exposing `players`; only UI
  state + mutations are scoped to the players feature. Verify all current consumers before
  deleting old wiring.
- **State relocation regressions:** moving ~21 state fields + handlers out of `AdminDashboard`.
  Mitigation: move logic verbatim; change behavior only in the new list/derivation/toolbar code.

## Constraint

**No git commits** of any of this work until the user explicitly orders it.
