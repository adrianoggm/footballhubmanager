---
name: penahub-backend
description: "Use when implementing or reviewing backend work in PeñaHub/footballhubmanager. Covers the FastAPI + SQLAlchemy hexagonal boundaries, current `pena` naming constraints, test placement, and backend validation commands."
---

# PeñaHub Backend

## When to use

Use this skill for backend features, bug fixes, endpoint changes, repository changes, and backend
reviews in this repository.

## Read this context first

- `AGENTS.md`
- `docs/backend.md`
- `docs/api.md` when contracts or payloads change
- `docs/testing.md`

Read adjacent production/test files before introducing a new pattern.

## Required architecture rules

- Controllers: `backend/src/api/interface/controller/v1`
  - transport only
  - map inputs/errors/responses
- Use cases: `backend/src/persistence/application/use_cases`
  - own orchestration and business rules
- Ports: `backend/src/persistence/application/ports`
  - define repository/service contracts
- Repositories: `backend/src/persistence/infrastructure/repository/db`
  - implement persistence details only

Do not move SQL or orchestration logic into controllers.

## Implementation workflow

1. Find the nearest existing use case/controller/repository analogue.
2. Change the contract boundary only where required.
3. Add or update tests in `backend/tests`.
4. Keep GUID-based external contracts stable unless the task explicitly changes them.
5. Preserve the current naming transition:
   - product-facing docs may say `footballhubmanager`
   - code and routes may still use `pena`

## Validation

Run the smallest relevant backend gate from repo root:

```bash
just format-check
just lint
just test-unit
```

If repository behavior, SQL interaction, or end-to-end API flow changed, consider:

```bash
just test-integration
```

## Review checklist

- Are controllers still thin?
- Does the use case own the rule?
- Is the port boundary still coherent?
- Did tests cover the changed behavior and edge cases?
- Did the change avoid leaking persistence details into higher layers?
