# AGENTS.md

## Purpose

This repository supports AI-assisted iteration. Use this file as the default operating contract for
planning, implementing, validating, and reviewing changes in `footballhubmanager` / `PeñaHub`.

## Project Snapshot

- Backend: FastAPI + SQLAlchemy + MySQL in `backend/`
- Frontend: React 18 + Vite + MUI in `frontend/`
- Quality gates:
  - Backend: `just check`
  - Frontend: `just frontend-check`
- Product naming is in transition:
  - Product/docs: `footballhubmanager`
  - Existing code/routes/domain terms: `pena`, `/api/v1/penas/...`

## Non-Negotiable Working Rules

1. Check local context before editing:
   - `git status --short`
   - the relevant docs under `docs/`
2. Keep changes scoped to the smallest vertical slice that solves the task.
3. Do not mix broad refactors with feature work unless the refactor is required for correctness.
4. Follow the repository's hexagonal architecture and conventions to the letter.
5. Preserve existing architectural boundaries instead of introducing shortcuts across layers.
6. Match the existing validation bar for the area you touch.
7. Do not edit generated or environment artifacts unless the task explicitly requires it:
   - `backend/.venv/`
   - `backend/htmlcov/`
   - `frontend/dist/`

## Backend Placement Rules

Use `docs/backend.md` as the main reference.

- Controllers live in `backend/src/api/interface/controller/v1`
- Request/response DTOs live beside controllers in `model/request` and `model/response`
- Dependency wiring lives in `backend/src/api/dependencies`
- Use cases live in `backend/src/core/application/use_cases`
- Ports live in `backend/src/core/application/ports`
- Application services and policies live in `backend/src/core/application/services` and
  `backend/src/core/application/policies`
- Domain helpers/value objects live in `backend/src/core/domain`
- Repositories/adapters live in `backend/src/persistence/infrastructure/repository/db`
- Domain entities live in `backend/src/persistence/domain/entity`
- Tests live in `backend/tests`

Backend guardrails:

- Hexagonal architecture is mandatory in backend changes.
- SOLID is mandatory, not aspirational:
  - `S`: one reason to change per module/class/use case whenever practical
  - `O`: extend behavior with explicit types/policies/use cases instead of boolean branches and scattered conditionals
  - `L`: implementations behind ports must be safely replaceable without surprising callers
  - `I`: ports stay small and purpose-specific; avoid wide interfaces that force unrelated dependencies
  - `D`: high-level policy depends on ports/contracts, never on SQLAlchemy or infrastructure details
- Controllers stay thin: validate input, call use cases, map errors.
- Use cases own orchestration and business rules.
- Ports define contracts; repositories implement them.
- Dependencies must continue to point inward:
  - Controllers -> Use Cases -> Ports <- Adapters
- Do not bypass ports to call repositories or SQL from controllers or unrelated layers.
- Do not move business rules into FastAPI wiring, DTOs, or repository helpers.
- Do not use boolean flags in Python APIs or use cases to switch behavior.
  - Bad: `execute(..., for_admin=True)` or `build_report(..., include_history=False)`
  - Prefer explicit policies, enums, separate methods, or separate use cases when behavior changes by mode.
  - Booleans are fine for stored state, but not as hidden control-flow switches.
- Keep API-facing GUID contracts intact unless the task explicitly changes them.
- If you add or change persistence behavior, add or update unit tests first when practical.

## Frontend Placement Rules

Use `docs/frontend.md` and `docs/frontend-sitemap.md` as the main references.

- Route pages live in `frontend/src/pages`
- Layouts and guards live in `frontend/src/layouts` and `frontend/src/router`
- Reusable UI lives in `frontend/src/components`
- Async orchestration and view-model logic live in `frontend/src/hooks`
- HTTP integration lives in `frontend/src/services`
- All user-facing text must flow through `frontend/src/i18n/messages.js`
- Global theme/style tokens live in `frontend/src/theme.js` and `frontend/src/index.css`

Frontend guardrails:

- Frontend conventions are mandatory for structure, naming, routing, i18n, and service placement.
- Keep route pages thin; move reusable stateful behavior into hooks/components.
- Reuse existing service and hook patterns before creating new abstractions.
- Preserve admin/user parity where the feature is meant to exist in both dashboards.
- Do not hardcode copy that should be translated.

## Iteration Loop

1. Scope the change:
   - define user-visible outcome
   - identify backend, frontend, docs, and tests touched
2. Implement the smallest safe slice:
   - backend contract first when API behavior changes
   - frontend wiring after the contract is clear
3. Validate at the right depth:
   - unit checks for the touched area
   - build/lint checks for frontend changes
   - integration tests when API + DB behavior changes
4. Summarize residual risks:
   - unverified flows
   - environment assumptions
   - follow-up cleanup

## Validation Matrix

- Backend-only change:
  - `just format-check`
  - `just lint`
  - `just test-unit`
- Frontend-only change:
  - `npm --prefix frontend run format:check`
  - `npm --prefix frontend run lint`
  - `npm --prefix frontend run build`
- Full-stack change:
  - `just check`
  - `just frontend-check`
- API, SQL, or repository behavior change:
  - consider `just test-integration`

## Repo Skills

Use these local skills when the task matches:

- `$penahub-iteration-planner`
- `$penahub-backend`
- `$penahub-frontend`
- `$penahub-quality-guard`
- `$code-review-expert`

## Git Hooks

Repository-managed hooks live in `.githooks/`.

- Install them once per clone with `just install-hooks`
- Enable the shared commit template once per clone with `git config commit.template .gitmessage` (Conventional Commits: `type(scope): subject`)
- `pre-commit` runs targeted lint/format checks for staged backend/frontend changes
- `pre-push` runs full impacted quality gates before pushing

To bypass hooks intentionally for a one-off command:

```bash
PENAHUB_SKIP_HOOKS=1 git commit ...
PENAHUB_SKIP_HOOKS=1 git push ...
```

## Primary References

- `README.md`
- `docs/overview.md`
- `docs/backend.md`
- `docs/frontend.md`
- `docs/testing.md`
- `docs/frontend-implementation-planning.md`
