# Player Directory Migration (#147) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin Player Directory's two-table + always-visible-forms layout with a single filterable player list, header buttons that open modals, and a total-players stat card — mirroring the accountability refactor.

**Architecture:** Player UI state + mutations move into a new `useAdminPlayers` hook instantiated in `AdminDashboard`; the hook keeps exposing `players` to sibling sections (accountability, overview) so there is a single central fetch. `AdminPlayersSection` becomes a self-contained view under a new `admin/players/` folder that consumes the hook. Identical components are reused (ConfirmDialog, PlayerEditDialogs) and StatCard is promoted to `common/`.

**Tech Stack:** React 18, Vite, MUI v5, vitest 3 (helpers only), i18n via `messages.js` (EN+ES).

## Global Constraints

- **NO git commits until the user explicitly orders it.** Every task ends in a *Checkpoint* (run the gate, stage nothing permanent) — do NOT run `git commit`. A single commit happens only on the user's order, at the end.
- Frontend gate command: `npm run check` (run in `frontend/`) = prettier check + eslint + `vitest run` + `vite build`. Must stay green.
- Single vitest file: `npx vitest run <path>` (run in `frontend/`).
- No backend / DB / API contract changes. Client-side pagination only.
- All user-facing text goes through `t(...)` with keys in BOTH the EN and ES blocks of `frontend/src/i18n/messages.js`.
- Styling: warm accountability palette (surfaces `#45342C`, text `#F4EEE8`, mono labels `#88736A` "JetBrains Mono", values "Hanken Grotesk", accent peach `#FCB491`), radius via `frontend/src/components/common/surfaceGeometry.js`, icons `material-symbols-rounded`.
- Working directory for all frontend commands: `c:\Users\adriano.garcia\Desktop\Developer\footballhubmanager\frontend`.

---

### Task 1: Pure helpers — `playersHelpers.js`

**Files:**
- Create: `frontend/src/components/admin/players/playersHelpers.js`
- Test: `frontend/src/components/admin/players/playersHelpers.test.js`

**Interfaces:**
- Produces:
  - `SEASON_STATUS = { ALL: 'all', IN_SEASON: 'in_season', OUT_OF_SEASON: 'out_of_season' }`
  - `isInSeason(player, seasonRosterGuids: Set<string>): boolean`
  - `playerSortKey(player): string`
  - `matchesSearch(player, query: string): boolean`
  - `filterPlayers(players, { search, roles: string[], positions: string[], status }, seasonRosterGuids): player[]`
  - `sortPlayers(players, sort: 'name_asc'|'name_desc'): player[]`
  - `paginate(items, page: number, pageSize: number): { pageItems, total, pageCount, shown }`

- [ ] **Step 1: Write the failing test**

```js
// frontend/src/components/admin/players/playersHelpers.test.js
import { describe, expect, it } from 'vitest'
import {
  SEASON_STATUS,
  filterPlayers,
  isInSeason,
  paginate,
  playerSortKey,
  sortPlayers,
} from './playersHelpers.js'

const P = (over) => ({
  guid: 'g',
  name: 'Marco',
  surname1: 'Asensio',
  surname2: '',
  nickname: 'The Sniper',
  role: 'member',
  position: 'FWD',
  has_account: true,
  ...over,
})

describe('playersHelpers', () => {
  it('derives season membership from the roster guid set', () => {
    const set = new Set(['a', 'b'])
    expect(isInSeason(P({ guid: 'a' }), set)).toBe(true)
    expect(isInSeason(P({ guid: 'z' }), set)).toBe(false)
  })

  it('builds a lowercase sort key from name + surnames', () => {
    expect(playerSortKey(P({ name: 'Luka', surname1: 'Maestro', surname2: '' }))).toBe(
      'luka maestro'
    )
  })

  it('search matches name, surnames and nickname case-insensitively', () => {
    const list = [P({ guid: '1', nickname: 'The Sniper' }), P({ guid: '2', name: 'Dani', surname1: 'Rock', nickname: 'The Tank' })]
    expect(filterPlayers(list, { search: 'sniper', roles: [], positions: [], status: SEASON_STATUS.ALL }, new Set()).map((p) => p.guid)).toEqual(['1'])
    expect(filterPlayers(list, { search: 'rock', roles: [], positions: [], status: SEASON_STATUS.ALL }, new Set()).map((p) => p.guid)).toEqual(['2'])
  })

  it('filters by role, position and season status', () => {
    const list = [
      P({ guid: '1', role: 'member', position: 'FWD' }),
      P({ guid: '2', role: 'guest', position: 'GK' }),
    ]
    const inSeason = new Set(['1'])
    expect(filterPlayers(list, { search: '', roles: ['guest'], positions: [], status: SEASON_STATUS.ALL }, inSeason).map((p) => p.guid)).toEqual(['2'])
    expect(filterPlayers(list, { search: '', roles: [], positions: ['FWD'], status: SEASON_STATUS.ALL }, inSeason).map((p) => p.guid)).toEqual(['1'])
    expect(filterPlayers(list, { search: '', roles: [], positions: [], status: SEASON_STATUS.IN_SEASON }, inSeason).map((p) => p.guid)).toEqual(['1'])
    expect(filterPlayers(list, { search: '', roles: [], positions: [], status: SEASON_STATUS.OUT_OF_SEASON }, inSeason).map((p) => p.guid)).toEqual(['2'])
  })

  it('sorts by display name asc and desc without mutating input', () => {
    const list = [P({ guid: '1', name: 'Zed', surname1: '' }), P({ guid: '2', name: 'Ana', surname1: '' })]
    expect(sortPlayers(list, 'name_asc').map((p) => p.guid)).toEqual(['2', '1'])
    expect(sortPlayers(list, 'name_desc').map((p) => p.guid)).toEqual(['1', '2'])
    expect(list.map((p) => p.guid)).toEqual(['1', '2']) // original untouched
  })

  it('paginates and clamps the page into range', () => {
    const items = Array.from({ length: 23 }, (_, i) => i)
    const r = paginate(items, 3, 10)
    expect(r.total).toBe(23)
    expect(r.pageCount).toBe(3)
    expect(r.pageItems).toEqual([20, 21, 22])
    expect(r.shown).toBe(3)
    expect(paginate(items, 99, 10).pageItems).toEqual([20, 21, 22]) // clamped to last page
    expect(paginate([], 1, 10)).toEqual({ pageItems: [], total: 0, pageCount: 1, shown: 0 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/players/playersHelpers.test.js`
Expected: FAIL — cannot resolve `./playersHelpers.js`.

- [ ] **Step 3: Write minimal implementation**

```js
// frontend/src/components/admin/players/playersHelpers.js
export const SEASON_STATUS = { ALL: 'all', IN_SEASON: 'in_season', OUT_OF_SEASON: 'out_of_season' }

export function isInSeason(player, seasonRosterGuids) {
  return Boolean(seasonRosterGuids && seasonRosterGuids.has(player.guid))
}

export function playerSortKey(player) {
  return [player.name, player.surname1, player.surname2]
    .filter(Boolean)
    .join(' ')
    .trim()
    .toLowerCase()
}

export function matchesSearch(player, query) {
  const q = (query || '').trim().toLowerCase()
  if (!q) return true
  const hay = [player.name, player.surname1, player.surname2, player.nickname]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}

export function filterPlayers(players, { search, roles, positions, status }, seasonRosterGuids) {
  const roleSet = new Set(roles || [])
  const posSet = new Set(positions || [])
  return (players || []).filter((p) => {
    if (!matchesSearch(p, search)) return false
    if (roleSet.size && !roleSet.has(p.role)) return false
    if (posSet.size && !posSet.has(p.position)) return false
    if (status === SEASON_STATUS.IN_SEASON && !isInSeason(p, seasonRosterGuids)) return false
    if (status === SEASON_STATUS.OUT_OF_SEASON && isInSeason(p, seasonRosterGuids)) return false
    return true
  })
}

export function sortPlayers(players, sort) {
  const copy = [...(players || [])]
  copy.sort((a, b) => playerSortKey(a).localeCompare(playerSortKey(b)))
  if (sort === 'name_desc') copy.reverse()
  return copy
}

export function paginate(items, page, pageSize) {
  const list = items || []
  const total = list.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page || 1), pageCount)
  const start = (safePage - 1) * pageSize
  const pageItems = list.slice(start, start + pageSize)
  return { pageItems, total, pageCount, shown: pageItems.length }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/players/playersHelpers.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Checkpoint** — `npm run check` green. Do NOT commit (see Global Constraints).

---

### Task 2: Promote `StatCard` to `common/`

**Files:**
- Create: `frontend/src/components/common/StatCard.jsx` (moved content)
- Delete: `frontend/src/components/admin/accountability/StatCard.jsx`
- Modify: `frontend/src/components/admin/accountability/AccountabilityKpis.jsx` (import path)

**Interfaces:**
- Produces: `StatCard` default export, props `{ label, value, sub, subTone, icon, accent, onClick }` (unchanged).

- [ ] **Step 1:** Copy `admin/accountability/StatCard.jsx` verbatim to `common/StatCard.jsx`. No code changes inside.

- [ ] **Step 2:** In `AccountabilityKpis.jsx`, change the import from `'./StatCard.jsx'` to `'../../common/StatCard.jsx'`. Delete the old `admin/accountability/StatCard.jsx`.

- [ ] **Step 3:** Grep for other importers: `npx rg "accountability/StatCard" src` — expect zero results after the edit.

- [ ] **Step 4: Checkpoint** — `npm run check` green (accountability view unchanged). Do NOT commit.

---

### Task 3: i18n keys for the new directory

**Files:**
- Modify: `frontend/src/i18n/messages.js` (EN block under `dashboard.admin`, ~line 454; ES block ~line 1564)

**Interfaces:**
- Produces (key paths under `dashboard.admin.directory`):
  `title, subtitle, statRegisteredLabel, btnAddSeasonPlayers, btnAddNewPlayer, btnTagConfig, searchPlaceholder, filtersLabel, sortLabel, filterRole, filterPosition, filterStatus, statusAll, statusInSeason, statusOutOfSeason, statusActive, actionAddToSeason, sortNameAsc, sortNameDesc, showingOfTotal, rowActionEdit, rowActionEditStats, rowActionAddToSeason, rowActionRemoveFromSeason, rowActionInvite, rowActionRemove, empty`

- [ ] **Step 1:** Add to the EN `dashboard.admin` object:

```js
directory: {
  title: 'Player Directory',
  subtitle: 'Manage club members, track performance metrics and season attendance.',
  statRegisteredLabel: 'Registered players',
  btnAddSeasonPlayers: 'Add Season Players',
  btnAddNewPlayer: 'Add New Player',
  btnTagConfig: 'Tag Configuration',
  searchPlaceholder: 'Search players by name or nickname…',
  filtersLabel: 'Filters',
  sortLabel: 'Sort',
  filterRole: 'Role',
  filterPosition: 'Position',
  filterStatus: 'Status',
  statusAll: 'All',
  statusInSeason: 'In season',
  statusOutOfSeason: 'Not in season',
  statusActive: 'Active',
  actionAddToSeason: 'Add to season',
  sortNameAsc: 'Name A–Z',
  sortNameDesc: 'Name Z–A',
  showingOfTotal: 'Showing {shown} of {total} players registered',
  rowActionEdit: 'Edit player',
  rowActionEditStats: 'Edit season stats',
  rowActionAddToSeason: 'Add to season',
  rowActionRemoveFromSeason: 'Remove from season',
  rowActionInvite: 'Invite link',
  rowActionRemove: 'Remove from peña',
  empty: 'No players match your filters.',
},
```

- [ ] **Step 2:** Add the ES mirror to the ES `dashboard.admin` object:

```js
directory: {
  title: 'Directorio de jugadores',
  subtitle: 'Gestiona los miembros del club, sus métricas y su asistencia por temporada.',
  statRegisteredLabel: 'Jugadores registrados',
  btnAddSeasonPlayers: 'Añadir a temporada',
  btnAddNewPlayer: 'Nuevo jugador',
  btnTagConfig: 'Configurar etiquetas',
  searchPlaceholder: 'Buscar jugadores por nombre o apodo…',
  filtersLabel: 'Filtros',
  sortLabel: 'Ordenar',
  filterRole: 'Rol',
  filterPosition: 'Posición',
  filterStatus: 'Estado',
  statusAll: 'Todos',
  statusInSeason: 'En temporada',
  statusOutOfSeason: 'Fuera de temporada',
  statusActive: 'Activo',
  actionAddToSeason: 'Añadir a temporada',
  sortNameAsc: 'Nombre A–Z',
  sortNameDesc: 'Nombre Z–A',
  showingOfTotal: 'Mostrando {shown} de {total} jugadores registrados',
  rowActionEdit: 'Editar jugador',
  rowActionEditStats: 'Editar stats de temporada',
  rowActionAddToSeason: 'Añadir a temporada',
  rowActionRemoveFromSeason: 'Quitar de temporada',
  rowActionInvite: 'Enlace de invitación',
  rowActionRemove: 'Eliminar de la peña',
  empty: 'Ningún jugador coincide con los filtros.',
},
```

- [ ] **Step 3: Checkpoint** — `npm run check` green (prettier will format the object). Do NOT commit.

---

### Task 4: `useAdminPlayers` hook (extract player state + mutations)

**Files:**
- Create: `frontend/src/hooks/useAdminPlayers.js`
- Modify: `frontend/src/components/AdminDashboard.jsx` (replace inline player state/handlers with the hook; keep passing `players` to accountability/overview)

**Interfaces:**
- Consumes: existing `adminService` methods (`createGuestPlayer`, `registerSeasonPlayer`, `registerSeasonPlayersBulk`, `updateSeasonPlayerStats`, `unregisterSeasonPlayer`, `updatePenaPlayerMembership`, `removePenaPlayerMembership`, `createClaimToken`, `updatePenaLabels`, `listPenaPlayers`, `listSeasonPlayers`).
- Produces `useAdminPlayers({ penaGuid, selectedSeasonGuid, selectedSeasonLabel, seasons, nationalities, penaLabels, notify })` returning:
  - `players` (all pena members), `seasonRosterGuids: Set`, `loading`
  - `toolbar: { search, roles, positions, status, sort, page }` + `toolbarActions: { setSearch, setRoles, setPositions, setStatus, setSort, setPage }`
  - `guestForm`, `onGuestField`, `resetGuestForm`
  - `labelsDraft` + label draft actions (`onLabelsDraftField`, `onLabelColorDraftChange`), `claimLinkPayload`, `closeClaimLink`
  - handlers (moved verbatim from `AdminDashboard`): `createGuestPlayer(addToSeason)`, `registerHistoricalPlayersInSeason(guids)`, `registerSinglePlayerInSeason(guid)`, `saveSeasonPlayer(draft)`, `removeSeasonPlayer(guid)`, `saveMembershipPlayer(draft)`, `removeMembershipPlayer(guid)`, `generateClaimLink(player)`, `savePenaLabels(draft)`, `reload()`

- [ ] **Step 1:** Create `useAdminPlayers.js`. MOVE — verbatim — the following from `AdminDashboard.jsx` into the hook: the player-related `useState`s (`historicalPlayers`→rename local to `players`, `seasonRoster`, `guestForm`, labels draft group, `memberFilters`, `claimLinkPayload`, loading flags) and the handlers listed in the map (`handleCreateGuestPlayer` 1478, `handleRegisterHistoricalPlayersInSeason` 1532, `handleRegisterSinglePlayerInSeason` 1554, `handleSaveSeasonPlayer` 1589, `handleRemoveSeasonPlayer` 1644, `handleSaveMembershipPlayer` 1680, `handleRemoveMembershipPlayer` 1711, `handleGenerateClaimLink`, `handleSavePenaLabels` 779, loaders `loadHistoricalPlayers` 880 / `loadSeasonRoster` 889). Do not change their bodies — only rehome them and accept `penaGuid`/`selectedSeasonGuid`/`notify` as hook args instead of closure vars.

- [ ] **Step 2:** Add NEW toolbar state in the hook (not present today): `search` (''), `roles` ([]), `positions` ([]), `status` (`SEASON_STATUS.ALL`), `sort` (`'name_asc'`), `page` (1) with their setters. Compute `seasonRosterGuids = new Set(seasonRoster.map((r) => r.player_guid))`.

- [ ] **Step 3:** In `AdminDashboard.jsx`, instantiate `const adminPlayers = useAdminPlayers({ penaGuid: selectedPenaGuid, selectedSeasonGuid, selectedSeasonLabel, seasons: seasonList, nationalities, penaLabels, notify })`. Replace the old `players`/`historicalPlayers` references used by accountability (line ~2? — the `players` prop passed to `AdminAccountabilitySection`) and overview with `adminPlayers.players`. Delete the now-moved state/handlers and the old `playersSection` prop bundle (1769-1815).

- [ ] **Step 4: Run the app and smoke-test** — `npm run dev`, log in, open the Accountability and Overview sections. Expected: both still render players (no console errors), because `adminPlayers.players` feeds them.

- [ ] **Step 5: Checkpoint** — `npm run check` green. Do NOT commit. (No unit test: this is a verbatim relocation; correctness = build green + the smoke-test above.)

---

### Task 5: `PlayerToolbar.jsx`

**Files:**
- Create: `frontend/src/components/admin/players/PlayerToolbar.jsx`

**Interfaces:**
- Consumes: `toolbar` + `toolbarActions` from Task 4; `roleOptions: string[]`, `positionOptions: string[]` (derived by the section from `penaLabels`), `t`.
- Produces: default export `PlayerToolbar({ toolbar, actions, roleOptions, positionOptions, t })`.

- [ ] **Step 1:** Build the toolbar: a search `TextField` (icon adornment, `placeholder={t('dashboard.admin.directory.searchPlaceholder')}`, value `toolbar.search`, `onChange` → `actions.setSearch`), and two outlined buttons "Filters" and "Sort" each opening an MUI `Menu`/`Popover`.
  - Filters popover: role multi-select (checkbox list from `roleOptions`), position multi-select (from `positionOptions`), status radio group (`All`/`In season`/`Not in season` → `SEASON_STATUS`). Wire to `actions.setRoles/setPositions/setStatus`.
  - Sort popover: radio `Name A–Z` / `Name Z–A` → `actions.setSort`.
  - Any filter/sort/search change also calls `actions.setPage(1)`.
- Styling: warm palette, `material-symbols-rounded` icons (`search`, `filter_list`, `sort`), radius via `surfaceGeometry`.

- [ ] **Step 2: Verify** — import `PlayerToolbar` temporarily in the section (Task 8 wires it for real) or run `npm run check`. Expected: eslint + build green.

- [ ] **Step 3: Checkpoint** — Do NOT commit.

---

### Task 6: `PlayerList.jsx` (the single table)

**Files:**
- Create: `frontend/src/components/admin/players/PlayerList.jsx`

**Interfaces:**
- Consumes: `players` (already filtered+sorted+paged by the section, OR raw + toolbar — see Step 1), `seasonRosterGuids`, per-row action callbacks, `t`, `formatPlayerDisplayName`, label chip helpers.
- Produces: default export `PlayerList({ pageItems, seasonRosterGuids, total, shown, page, pageCount, onPageChange, onAddToSeason, onRowAction, t, formatPlayerDisplayName, penaLabels })`.

- [ ] **Step 1:** Render an MUI `Table` with columns NAME · NICKNAME · ROLE (label chip) · POSITION (colored label chip via existing `labelChipSx`/label translators) · STATUS · ACTIONS.
  - STATUS cell: `isInSeason(player, seasonRosterGuids)` → green `t('dashboard.admin.directory.statusActive')` text; else an inline outlined button `t('dashboard.admin.directory.actionAddToSeason')` calling `onAddToSeason(player)`.
  - ACTIONS cell: an icon button (`more_vert`) opening a `Menu` whose items are built per-row: `rowActionEdit` (always), `rowActionEditStats` (only if inSeason), `rowActionAddToSeason`/`rowActionRemoveFromSeason` (toggle on inSeason), `rowActionInvite` (only if `!player.has_account`), `rowActionRemove`. Each item calls `onRowAction(actionKey, player)`.
  - Empty state row when `pageItems.length === 0` → `t('dashboard.admin.directory.empty')`.
- [ ] **Step 2:** Footer: `t('dashboard.admin.directory.showingOfTotal', { shown, total })` on the left; MUI `Pagination` (page numbers) on the right wired to `onPageChange`.
- Styling: warm surfaces, header row mono labels `#88736A`, `theme.custom.dashboard.radius`.

- [ ] **Step 3: Verify** — `npm run check` green (eslint/build). Do NOT commit.

---

### Task 7: The four form modals

**Files:**
- Create: `frontend/src/components/admin/players/NewPlayerDialog.jsx`
- Create: `frontend/src/components/admin/players/AddSeasonPlayersDialog.jsx`
- Create: `frontend/src/components/admin/players/LabelsDialog.jsx`
- Create: `frontend/src/components/admin/players/ClaimLinkDialog.jsx`

**Interfaces:**
- Produces controlled dialogs, each `({ open, onClose, ...formProps })`:
  - `NewPlayerDialog` — wraps the current Guest form (fields name/surname1/surname2/nationality/nickname/role/position; buttons "Create" → `onCreate(false)`, "Create + add to season" → `onCreate(true)`). Source: `AdminPlayersSection.jsx` lines 593-696.
  - `AddSeasonPlayersDialog` — wraps the bulk `Autocomplete` of `availableHistoricalPlayers` + "Add Selected To Season" (`onAdd(guids)`). Source: lines 223-269.
  - `LabelsDialog` — wraps the labels editor (role/position label textareas + `LabelColorList`), `onSave(draft)`. Source: lines 768-831 (already a `Dialog`).
  - `ClaimLinkDialog` — wraps the copyable claim URL + expiry. Source: lines 833-872 (already a `Dialog`).

- [ ] **Step 1:** For each dialog, MOVE the existing JSX/form from `AdminPlayersSection.jsx` (exact source ranges above) into the new file wrapped in an MUI `Dialog` with `open`/`onClose`. Keep field wiring identical; the two that are already `Dialog`s (Labels, ClaimLink) are near-verbatim extractions. Apply the peach `#FCB491` accent to primary buttons (accountability `NewTransactionCard` pattern).
- [ ] **Step 2:** `LabelColorList` (currently inline in `AdminPlayersSection.jsx` 54-84) moves next to `LabelsDialog` (co-locate). Update imports.
- [ ] **Step 3: Verify** — `npm run check` green. Do NOT commit.

---

### Task 8: Assemble `AdminPlayersSection` + wire into `AdminDashboard`

**Files:**
- Rewrite: `frontend/src/components/admin/AdminPlayersSection.jsx` (self-contained view)
- Modify: `frontend/src/components/AdminDashboard.jsx` (render new section; remove dead layout/props)

**Interfaces:**
- Consumes: `useAdminPlayers` bundle (Task 4), `PlayerToolbar` (5), `PlayerList` (6), the four dialogs (7), reused `PlayerEditDialogs` + `common/ConfirmDialog` + `common/StatCard`.
- Produces: `AdminPlayersSection({ penaGuid, selectedSeasonGuid, selectedSeasonLabel, seasons, nationalities, penaLabels, players, adminPlayers, t, formatPlayerDisplayName, formatEpochSeconds })` (the hook bundle may be passed in from `AdminDashboard` as `adminPlayers`, per the "central hook" decision).

- [ ] **Step 1:** Rebuild the section body top-to-bottom per the spec layout:
  - Header: `title`/`subtitle` (`directory.title/subtitle`).
  - Button row + `StatCard` (label `directory.statRegisteredLabel`, value `players.length`, icon `groups`, accent peach). Buttons open `NewPlayerDialog` / `AddSeasonPlayersDialog` / `LabelsDialog` via hook dialog state.
  - `<PlayerToolbar>`; derive `roleOptions`/`positionOptions` from `penaLabels`.
  - Compute `filtered = sortPlayers(filterPlayers(players, {search,roles,positions,status}, seasonRosterGuids), sort)` then `paged = paginate(filtered, page, 10)` (helpers from Task 1).
  - `<PlayerList pageItems={paged.pageItems} total={paged.total} shown={paged.shown} page={page} pageCount={paged.pageCount} .../>`.
  - Render modals at the end: the four new dialogs + reused `EditSeasonPlayerDialog`, `EditMembershipDialog`, `ConfirmDialog` (driven by hook dialog state). `onRowAction(key, player)` maps to hook handlers / dialog openers.
- [ ] **Step 2:** In `AdminDashboard.jsx`, render `<AdminPlayersSection penaGuid={selectedPenaGuid} selectedSeasonGuid={selectedSeasonGuid} selectedSeasonLabel={...} seasons={seasonList} nationalities={nationalities} penaLabels={penaLabels} players={adminPlayers.players} adminPlayers={adminPlayers} t={t} formatPlayerDisplayName={...} formatEpochSeconds={...} />` at the players route (was 2171-2179). Remove the old `EditSeasonPlayerDialog`/`EditMembershipDialog`/`ConfirmDialog` blocks that lived in the dashboard for players (2310-2371) — they now live inside the section. Delete any now-unused imports/vars.
- [ ] **Step 3:** Delete the old two-table/inline-form JSX and inline helpers left in the previous `AdminPlayersSection` (fully replaced).
- [ ] **Step 4: Run the app** — `npm run dev`. Verify: single list renders all members; STATUS shows Active / Add-to-season; ⋮ menu actions work (edit, edit stats when in-season, add/remove season, invite when no account, remove); the three header buttons open their modals; search/filters/sort/pagination work; stat card shows total registered. No console errors.
- [ ] **Step 5: Checkpoint** — `npm run check` green. Do NOT commit.

---

### Task 9: Final verification

**Files:** none (verification only).

- [ ] **Step 1:** Run the full gate: `npm run check`. Expected: prettier ✓, eslint ✓, `vitest run` ✓ (playersHelpers tests pass), `vite build` ✓.
- [ ] **Step 2:** Manual parity walkthrough against the old view: create guest player (both buttons), bulk add to season, single add-to-season from row, edit membership, edit season stats, generate invite link, remove from season, remove from peña, tag configuration save. Each must behave as before.
- [ ] **Step 3:** Confirm accountability + overview still receive players and render unchanged (shared-data check).
- [ ] **Step 4:** Report completion to the user and **await their explicit order before any commit** (Global Constraints).

---

## Self-Review

**Spec coverage:** single list + STATUS (Task 6) ✓; remove scoreboard/keep stat editing in ⋮ (Task 6 menu) ✓; 3 header buttons→modals (Tasks 7-8) ✓; stat card = total registered, no trend (Task 8) ✓; self-contained + central hook exposing players (Task 4) ✓; reuse StatCard/ConfirmDialog/PlayerEditDialogs (Tasks 2, 7, 8) ✓; filters/sort/search + client pagination (Tasks 1,5,6) ✓; warm styling + i18n EN/ES (Tasks 3-8) ✓; helper tests (Task 1) ✓; shared-data risk verified (Tasks 4,9) ✓.

**Placeholder scan:** helper code + tests are complete; extraction tasks cite exact source line ranges from the design map instead of re-transcribing (verbatim moves). No TBD/TODO.

**Type consistency:** hook bundle names (Task 4) reused by Tasks 5/6/8; helper signatures (`filterPlayers`/`sortPlayers`/`paginate`/`isInSeason`) consistent across Tasks 1, 6, 8; `SEASON_STATUS` values consistent (Tasks 1, 3, 5).

## Note on TDD scope

Only `playersHelpers` gets red/green unit tests (vitest) — that's where the non-trivial logic lives and matches the repo convention (accountability tests only its helpers). React components are verified by `npm run check` (eslint + build) + the manual walkthrough, per this repo's frontend gate. This is deliberate, not a gap.
