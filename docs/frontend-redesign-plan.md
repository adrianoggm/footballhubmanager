# Frontend Redesign Plan (Issue #98)

> Status: **Proposal / for review** · Owner: frontend · Scope: `frontend/src` (React 18 + Vite + MUI 5)
> Goal of this document: agree on *how* we tackle the UX/coherence/performance debt **before** writing code.
> Every improvement that ships under this plan must update `docs/frontend*.md` (see [§8 Documentation Discipline](#8-documentation-discipline)).

## 1. Why this exists

The app works, but using it does not feel *organic*. Admins and players are shown a lot of
information they don't know how to navigate, screens don't feel consistent with each other,
and the heaviest views render everything at once. The root cause is not "bad design" — it is
that two screens grew into **monoliths that own everything**:

| File | Lines | Role |
|------|------:|------|
| `frontend/src/components/AdminDashboard.jsx` | 3,583 | Owns all admin state, forms, handlers, layout |
| `frontend/src/components/UserDashboard.jsx` | 1,321 | Same, for players |
| `frontend/src/components/admin/AdminMatchesSection.jsx` | 1,265 | Match list + create form + detail editor |
| `frontend/src/components/admin/AdminInsightsSection.jsx` | 1,093 | 8 KPIs + 2 charts + 3 tables, no disclosure |
| `frontend/src/components/admin/AdminPlayersSection.jsx` | 849 | Two paginated tables side by side |
| `frontend/src/components/admin/AdminAccountabilitySection.jsx` | 774 | Funds + debts + expenses + 3 forms |

`AdminDashboard.jsx` alone holds **51 `useState`**, **~10 inline forms**, **0 `useCallback`**, and
**0 memoized children**. Section components receive 50+ props and re-render on any parent state change.
This single fact drives all four pains we want to fix.

The good news: the **foundations are already correct** and we build on them, not against them.
- Role-based router + guards: `frontend/src/router/AppRouter.jsx`, `frontend/src/router/guards/*`
- A real shell with desktop rail + mobile nav: `frontend/src/components/dashboard/DashboardShell.jsx`
- A sitemap as source of truth: `frontend/src/navigation/sitemap.js`
- Sections are already **lazy-loaded** with `Suspense` (good for performance).
- A themed design system exists in `frontend/src/theme.js` (light/dark presets, typography scale).

## 2. Goals & non-goals

**Goals**
1. **Navigation / findability** — a person always knows *where they are*, *what context they're in*
   (peña + season), and *how to get to the next thing*.
2. **Information clarity** — progressive disclosure; one primary job per screen; scannable hierarchy.
3. **Visual coherence** — every screen built from the same tokens and the same reusable primitives.
4. **Performance** — treated as a *constant constraint across every phase*, not a final phase.
5. **Documented** — the sitemap, component library, and design tokens are kept in `docs/` as we go.

**Non-goals (for this plan)**
- No backend/API changes. The frontend respects current `/api/v1` contracts (`services/*`).
- No new framework or state library unless §5 proves it necessary (default: React Context + hooks).
- No rebrand of the visual identity (colors/typography presets stay); we *systematize* what exists.

## 3. Design principles (the rules every screen follows)

1. **One context bar, everywhere.** Peña + season selection is a single shared control rendered by
   the shell, not re-implemented per screen. Today it is rebuilt in both dashboards
   (`AdminDashboard.jsx:2678-2716`, mirrored in `UserDashboard.jsx`).
2. **One primary action per view.** Each section has a clear primary CTA; secondary actions move into
   overflow menus / drawers.
3. **Progressive disclosure.** Default to summary; reveal detail on demand (tabs, accordions, drawers,
   "show more"). No screen renders 3 tables + 2 charts + 8 KPIs at once (today: `AdminInsightsSection`).
4. **Every async view declares 5 states.** loading / empty / error+retry / forbidden / ready — using
   *shared* components, not copy-pasted `<Alert>` and `<Typography>` (today: 7+ ad-hoc empty states).
5. **Tokens, not hex.** No raw hex in components. ~20 hardcoded colors (role/position labels, insight
   accents) move into the theme (`AdminDashboard.jsx:109-123`, `AdminInsightsSection.jsx:36-67`).
6. **Components stay small.** Target: no view component over ~400 lines; forms and tables are their own
   components with local state.

## 4. Workstreams (mapped to the four pains)

These are the *what*. The *when* is in [§6 Roadmap](#6-phased-roadmap). Workstream A (structure) is the
enabler the other three depend on, so it leads each phase rather than being a separate milestone.

### A. Structural decomposition (the enabler)
- Extract a **context layer**: `DashboardContext` (peña, season, role, section) via React Context +
  a `useDashboardContext` hook, replacing prop-drilling and the manual `applySeasonContext()` reset
  (`AdminDashboard.jsx:1589`).
- Extract **forms** into self-contained components with local state and a shared `useForm` helper,
  replacing the ~10 inline `onXField` closures.
- Extract a **stale-request hook** `useFetchWithStaleCheck` from the 3x duplicated `requestIdRef`
  pattern (`UserDashboard.jsx:315-347`).
- Reduce `AdminDashboard.jsx` / `UserDashboard.jsx` to thin orchestrators (< ~400 lines each) that
  wire context + render sections.

### B. Navigation & information architecture (pain: navigation)
- **Persistent context bar** in the shell: brand · peña selector · season selector · role · user menu.
  When no peña/season is selected, the bar shows the next required step (not a blank screen).
- **Guided empty/zero states**: "Select a peña to continue" / "Create your first season" with a CTA,
  replacing soft-disabled sections.
- **Breadcrumb / section title coherence** driven entirely by `sitemap.js` (single source of truth).
- Audit guard redirects (`router/guards/*`) so context loss never dead-ends the user.

### C. Information clarity (pains: overload + coherence)
- **Insights**: group the 8 KPIs + 2 charts + 3 tables behind tabs/accordions; load charts on demand.
- **Matches**: split list / create / detail into separate surfaces (list + drawer/route for detail).
- **Players & Accountability**: progressive tables (one focus table at a time, filters first).
- Shared **section header** pattern: title · context chip · primary CTA · overflow.

### D. Design system & visual coherence (pain: coherence)
- Promote design tokens to `theme.js`: **label color palette** (roles/positions), **insight accents**,
  spacing/radius scale (geometry currently lives half in `DashboardShell.jsx:13-30`).
- Build a small **shared primitives library** under `components/common/`:
  `EmptyState`, `ErrorState`, `LoadingState`, `ConfirmDialog`, `SectionHeader`, `PaginatedTable`,
  `StatCard`, `PenaSeasonSelector`. These replace the duplicated ad-hoc versions.
- Lint rule / review checklist: no new raw hex, no new inline-only spacing magic numbers.

### E. Performance (constant constraint — applies to A–D)
- **Memoize sections** (`React.memo`) once they take a stable, minimal prop set from context (depends
  on Workstream A — prop count drops from 50+ to a handful).
- `useCallback` for handlers passed to memoized children (currently 0 in `AdminDashboard.jsx`).
- Memoize derived option lists built inline in render (`AdminMatchesSection.jsx:371-375`, nav items
  `AdminDashboard.jsx:2546`).
- Keep **recharts** isolated to the insights chunk; lazy-load charts within the insights tab so the
  rest of the app never pays for it.
- Paginate/virtualize the unbounded insights matrix table.
- **Gate:** every phase must keep `npm --prefix frontend run build` green and not regress bundle size
  of the initial route.

## 5. Architecture decision: how much state machinery?

**Decision: React Context + custom hooks. No Redux/Zustand yet.**

Rationale: the problem is *consolidation in one component*, not *global state complexity*. A
`DashboardContext` per role + feature hooks (`useAdminSeasons`, `useAdminMatches` already exist)
solves prop-drilling and the manual resets without adding a dependency. We re-evaluate only if a
proven cross-cutting need appears (it currently does not). This keeps bundle and learning cost low.

## 6. Phased roadmap

Both audiences are in scope; admin leads because it is the largest/messiest and produces the shared
primitives the user side reuses. Each phase is independently shippable and leaves the app green.

> **Progress:** Phase 0 ✅ · Phase 1 ✅ · Phase 2 🚧 in progress.
> Done so far: insights tabs + deferred charts; token migration / 0-raw-hex; standings extracted to a
> lazy section; overview extracted to an eager section; admin season/players nav gating + guided empty
> states; header layout cleanup (appearance/language moved into settings dialogs, compact identity);
> 4 confirmation dialogs migrated to the shared `ConfirmDialog`; season-player + membership edit
> dialogs extracted to `admin/PlayerEditDialogs.jsx`. `AdminDashboard` 3583 → 3044 lines.
> Remaining Phase 2: matches list/create/detail split, admin form extraction, section memoization
> (needs prop-bundle stabilization first). Phases 3–4 pending.

### Phase 0 — Foundations (shared, no visible change) ✅
- Create `components/common/` primitives: `EmptyState`, `ErrorState`, `LoadingState`,
  `ConfirmDialog`, `SectionHeader`, `StatCard`, `PaginatedTable`.
- Promote tokens into `theme.js` (label colors, insight accents, geometry).
- Add `useForm` and `useFetchWithStaleCheck` hooks.
- **Docs:** new `docs/frontend-design-system.md` describing tokens + primitives.

### Phase 1 — Shared navigation & context ✅
- Build `PenaSeasonSelector` + persistent context bar in `DashboardShell`.
- Introduce `DashboardContext`; both dashboards consume it (selection logic moves out of the monoliths).
- Guided empty states for "no peña" / "no season".
- **Docs:** update `docs/frontend-sitemap.md` with the context-bar behavior.

### Phase 2 — Admin decomposition + clarity
- Extract admin forms (season, match, guest, membership) into components.
- Insights: tabs/accordions + on-demand chart loading.
- Matches: list / create / detail split.
- Memoize admin sections + handlers. Reduce `AdminDashboard.jsx` to an orchestrator.
- **Docs:** update `docs/frontend.md` admin component map.

### Phase 3 — User decomposition + clarity (reuses Phase 2 primitives)
- Apply the same patterns to `UserDashboard.jsx`: forms out, shared states, memoization.
- Reduce `UserDashboard.jsx` to an orchestrator.
- **Docs:** update `docs/frontend.md` user component map.

### Phase 4 — Polish & performance pass
- Visual coherence sweep (spacing/radius/typography consistency across all sections).
- Accessibility pass: focus states, contrast, ≥44px touch targets (per existing handoff checklist in
  `docs/frontend-implementation-planning.md:670`).
- Bundle + render profiling; virtualize remaining heavy tables.
- **Docs:** finalize the design-system doc; add a short "how to add a screen" recipe.

## 7. Success criteria

- `AdminDashboard.jsx` and `UserDashboard.jsx` each **< ~400 lines**; no section file > ~600.
- **0 raw hex** colors in components (all via theme tokens).
- Every async section renders via the **5 shared state components** (no ad-hoc empties/alerts).
- Peña + season selection exists in **exactly one** component.
- Production build stays green; initial-route bundle does not grow; recharts stays out of the initial chunk.
- A new contributor can place a feature using only `docs/frontend-sitemap.md` +
  `docs/frontend-design-system.md`.

## 8. Documentation discipline

Because issue #98 requires improvements to be documented, each phase's PR must touch the relevant doc:

| Artifact | Doc kept in sync |
|----------|------------------|
| Routes / sections / context bar | `docs/frontend-sitemap.md` |
| Component map / layers | `docs/frontend.md` |
| Tokens + shared primitives | `docs/frontend-design-system.md` *(new in Phase 0)* |
| Roadmap status | this file (`docs/frontend-redesign-plan.md`) |

## 9. Risks & mitigations

- **Refactor regressions** → ship per-phase, keep build green, lean on the existing visual parity
  between admin/user to validate reused primitives.
- **Scope creep into a rebrand** → explicitly out of scope (§2); we systematize existing tokens only.
- **"Big bang" temptation** → forbidden; the monolith is dismantled incrementally behind the context
  layer so each PR is reviewable and shippable.

## 10. Open questions for review

1. Should match **detail** become its own route (`/app/admin/matches/:id`) or stay a drawer/dialog?
2. Is a peña-level **overview/home** wanted for users (parity with admin `overview`), or keep their
   entry on `membership`?
3. Any appetite for a lightweight **virtualization** dep (e.g. for large rosters/insights matrices),
   or keep pagination-only to avoid new dependencies?
