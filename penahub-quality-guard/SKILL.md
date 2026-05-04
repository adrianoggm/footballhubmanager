---
name: penahub-quality-guard
description: "Use when validating a PeñaHub change before commit, push, or review. Select the right backend, frontend, or full-stack checks from the touched files and report what remains unverified."
---

# PeñaHub Quality Guard

## When to use

Use this skill when the main task is validation, release confidence, or deciding which quality gates
must run for a change in this repository.

## Read this context first

- `AGENTS.md`
- `docs/testing.md`
- `.github/workflows/ci.yml` when CI parity matters

## Validation selection

### Backend changes

If files under `backend/` or backend wiring files changed, run:

```bash
just format-check
just lint
just test-unit
```

### Frontend changes

If files under `frontend/` changed, run:

```bash
just frontend-check
```

### Full-stack changes

If both surfaces changed, run:

```bash
just check
just frontend-check
```

### API or persistence flow changes

If the change touches controllers, repositories, SQL, or request/response contracts, consider:

```bash
just test-integration
```

## Reporting rules

Always report:

- which gates ran
- which gates were skipped and why
- whether verification was local-only or CI-equivalent
- any missing prerequisites such as `backend/.venv` or `frontend/node_modules`

## Repo-specific notes

- Local hooks live in `.githooks/` and are installed with `just install-hooks`.
- Hooks are a fast guardrail, not a substitute for intentional validation on larger changes.
