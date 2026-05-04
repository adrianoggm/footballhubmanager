---
name: penahub-iteration-planner
description: "Use when scoping a new PeñaHub feature, bugfix, or refactor. Break work into backend, frontend, docs, and tests, align it with the current roadmap and naming transition, and propose the smallest safe delivery order."
---

# PeñaHub Iteration Planner

## When to use

Use this skill before substantial implementation when the request needs a concrete execution plan for
this repository, not a generic software plan.

## Required context

Read only what is needed:

- `README.md`
- `AGENTS.md`
- `docs/overview.md`
- `docs/frontend-implementation-planning.md` when the task affects the UI flow
- `docs/backend.md` or `docs/frontend.md` when the task is clearly limited to one layer

## Planning workflow

1. Define the user-visible outcome in one sentence.
2. Map the change to affected layers:
   - backend contract
   - frontend route/page/component/hook
   - docs
   - tests
3. Check whether the task touches the naming transition:
   - product language may say `footballhubmanager`
   - existing code may still require `pena` terms
4. Prefer the smallest delivery order:
   - contract or model changes first
   - persistence and tests next
   - frontend wiring after the data shape is stable
   - docs and cleanup last
5. Call out validation explicitly:
   - backend unit tests
   - frontend lint/build
   - integration tests when API + DB behavior changes

## Output shape

Produce a compact execution plan with:

- outcome
- affected files or folders
- implementation order
- validation commands
- residual risks or assumptions

## Repo-specific heuristics

- Reuse existing use-case and hook patterns before introducing new abstractions.
- Keep controllers thin and route pages thin.
- If a change spans admin and user surfaces, decide explicitly whether parity is required.
- If the task is analytics-related, check both backend calculations and frontend presentation.
