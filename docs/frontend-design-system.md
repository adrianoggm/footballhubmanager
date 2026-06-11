# Frontend Design System

> Companion to the [Frontend Redesign Plan](frontend-redesign-plan.md). This document is the
> reference for **design tokens** and **shared UI primitives** introduced in Phase 0.
> Rule of thumb: build screens from these primitives and tokens — do not re-implement empty/error
> states, paginated tables, or raw hex colors inside feature components.

## 1. Design tokens

### Source of truth
- Canonical values: `frontend/src/theme/tokens.js`
- Exposed on the MUI theme as `theme.custom.*` via `frontend/src/theme.js`

### Label colors (roles & positions)
Used for member role/position chips. Previously hardcoded in `AdminDashboard.jsx`,
`AdminPlayersSection.jsx`, and `UserDashboard.jsx`.

- `theme.custom.labels.role` / `theme.custom.labels.position` — `{ key: hex }` maps
- `theme.custom.labels.defaultColor` — neutral fallback (`#64748B`)
- Helper: `resolveLabelColor(kind, label)` from `theme/tokens.js`
  (`kind` = `'role' | 'position'`, case-insensitive)

```js
import { resolveLabelColor } from '../../theme/tokens.js'
const color = resolveLabelColor('position', 'keeper') // '#EA580C'
```

### Insight accents
Accent palette for insight KPI cards and chart series (was inline in `AdminInsightsSection.jsx`).

- `theme.custom.insightAccents[kind]` → `{ main, soft, border }`
- Kinds: `matches`, `seasons`, `players`, `goals`, `assists`, `saves`
- Also exported as `INSIGHT_ACCENTS` from `theme/tokens.js`

### Surface geometry
Radii, border opacities, and shadows for cards/panels. Read with a single helper instead of
re-deriving per component:

```js
import { getSurfaceGeometry } from '../common'
const geometry = getSurfaceGeometry(theme)
// { surfaceRadius, surfaceRadiusTight, controlRadius, badgeRadius,
//   subtleBorderAlpha, strongBorderAlpha, cardShadow, panelShadow }
```

Underlying tokens live in `theme.custom.dashboard.{radius,borderOpacity,shadows}` (see `theme.js`).

### Spacing & typography
- Spacing: MUI 8pt grid (`theme.spacing`); use multipliers in `sx` (`p: 1.5`), not raw px.
- Typography: Space Grotesk scale defined in `theme.js` (`createSpaceTypography`). Use MUI
  `variant` props (`h6`, `subtitle1`, `body2`, `overline`, `caption`) rather than ad-hoc font sizes.

### Rule
**No raw hex colors in feature components.** Pull from `theme.palette.*`, `theme.custom.*`, or
`theme/tokens.js`. New label kinds / accents are added in `tokens.js`, not inline.

## 2. Shared primitives

Location: `frontend/src/components/common/`. Import via the barrel:

```js
import { EmptyState, ErrorState, LoadingState, ConfirmDialog,
         SectionHeader, StatCard, PaginatedTable } from '../common'
```

All primitives are **copy-agnostic** — callers pass already-translated strings (via `useI18n`),
so they stay reusable across locales.

| Component | Purpose | Key props |
|-----------|---------|-----------|
| `EmptyState` | Zero-data / "select a peña" placeholder | `icon?`, `title`, `description?`, `action?`, `dense?` |
| `ErrorState` | Blocking load error with retry | `title`, `description?`, `onRetry?`, `retryLabel?` |
| `LoadingState` | Loading bar or skeleton | `variant` (`'linear'`\|`'skeleton'`), `label?`, `rows?` |
| `ConfirmDialog` | Destructive/confirm dialog | `open`, `onConfirm`, `onCancel`, `title`, `description?`, `confirmLabel?`, `cancelLabel?`, `destructive?`, `loading?` |
| `SectionHeader` | Section title + primary CTA + overflow | `title`, `subtitle?`, `contextChip?`, `primaryAction?`, `secondary?` |
| `StatCard` | KPI tile | `label`, `value`, `helper?`, `tone?`, `icon?` |
| `PaginatedTable` | Self-paginating table | `columns`, `rows`, `getRowKey?`, `defaultRowsPerPage?`, `emptyState?`, `onRowClick?` |

### The "5 states" contract
Every async section should render exactly one of: **loading / empty / error+retry / forbidden / ready**,
using `LoadingState`, `EmptyState`, `ErrorState` (forbidden = `ErrorState` with forbidden copy).
This replaces the 7+ ad-hoc `<Alert>`/`<Typography>` placeholders found across sections.

### PaginatedTable example
```jsx
<PaginatedTable
  columns={[
    { key: 'name', label: t('...') },
    { key: 'points', label: t('...'), align: 'right' },
    { key: 'actions', label: '', render: (row) => <RowMenu row={row} /> },
  ]}
  rows={players}
  getRowKey={(row) => row.guid}
  emptyState={<EmptyState title={t('...')} />}
/>
```

## 3. Hooks

Location: `frontend/src/hooks/`.

| Hook | Purpose |
|------|---------|
| `useForm(initial)` | Form state + `onField(name, transform?)` change-handler factory + `reset()`. Replaces inline `onXField` closures. |
| `useFetchWithStaleCheck()` | `run(task)` guards async results against stale-write races (replaces hand-rolled `requestIdRef`). Task receives `{ isStale, requestId }`. |

```js
const { values, onField, reset } = useForm(defaultSeasonForm)
// numeric coercion for points_* fields:
<TextField value={values.points_win} onChange={onField('points_win', Number)} />

const { run } = useFetchWithStaleCheck()
run(async ({ isStale }) => {
  const data = await adminService.loadSeasons()
  if (isStale()) return
  setSeasons(data)
})
```

## 4. Adding a new screen (recipe)

1. Define the section in `frontend/src/navigation/sitemap.js` (see `docs/frontend-sitemap.md`).
2. Compose the screen from `common` primitives + `SectionHeader`.
3. Handle all 5 async states with the shared components.
4. Pull every color/spacing value from theme tokens — no raw hex.
5. Add i18n keys in `frontend/src/i18n/messages.js` (en + es).
6. Validate: `npm --prefix frontend run check`.

## 5. Migration status

Phase 0 introduces the tokens, primitives, and hooks. Existing feature components still contain
their original inline implementations; they are migrated to these primitives in Phases 2–3 of the
redesign plan. Track progress in [frontend-redesign-plan.md](frontend-redesign-plan.md).
