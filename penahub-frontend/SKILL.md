---
name: penahub-frontend
description: "Use when implementing or reviewing frontend work in PeñaHub/footballhubmanager. Covers the React + Vite dashboard structure, routing/guards, hook and service patterns, i18n requirements, and frontend validation commands."
---

# PeñaHub Frontend

## When to use

Use this skill for frontend pages, dashboard sections, custom hooks, services, routing, and UI
reviews in this repository.

## Read this context first

- `AGENTS.md`
- `docs/frontend.md`
- `docs/frontend-sitemap.md` when navigation or page placement changes
- `docs/testing.md`

Inspect similar pages/components/hooks before creating a new abstraction.

## Required structure rules

- Pages live in `frontend/src/pages`
- Layouts and guards live in `frontend/src/layouts` and `frontend/src/router`
- Shared UI lives in `frontend/src/components`
- Async orchestration belongs in `frontend/src/hooks`
- API interaction belongs in `frontend/src/services`
- User-facing copy belongs in `frontend/src/i18n/messages.js`

## Implementation workflow

1. Decide whether the change is route-level, page-level, component-level, or hook-level.
2. Reuse the existing dashboard/service patterns before creating a new state container.
3. If admin and user experiences should match, verify both surfaces explicitly.
4. Keep business rules on the backend when possible; keep the frontend focused on orchestration and presentation.
5. Add translations for every new visible string.

## Validation

Run the frontend gate from repo root:

```bash
npm --prefix frontend run format:check
npm --prefix frontend run lint
npm --prefix frontend run build
```

Or use:

```bash
just frontend-check
```

## Review checklist

- Are route pages still thin?
- Should this logic live in a reusable hook or service?
- Were all new strings added to i18n messages?
- Does the feature belong in admin, user, or both?
- Did the final state preserve the existing sitemap and guard model?
