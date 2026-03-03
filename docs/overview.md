# Project Overview

`footballhubmanager` is a monorepo for managing amateur football communities, players, seasons,
matches, standings, and match analytics.

The codebase still uses `pena` terminology in many backend routes and domain objects
(for example, `/api/v1/penas/...`). This is expected during the naming transition.

## Repository Layout

- `backend/`: FastAPI service with hexagonal architecture.
- `frontend/`: React + Vite client (admin and user dashboards).
- `docs/`: Project documentation.
- `docker/`: Docker Compose files for local and CI-like environments.
- `versioning/sql/`: SQL schema versions and seed data.
- `.github/workflows/ci.yml`: CI pipeline.
- `justfile`: Unified task runner commands.

## Tech Stack

- Backend: Python, FastAPI, SQLAlchemy, PyMySQL, pytest, ruff.
- Frontend: React, Vite, Material UI, Recharts.
- Database: MySQL 8.
- Tooling: Just, ESLint, Prettier, GitHub Actions.

## Prerequisites

- Docker + Docker Compose plugin (`docker compose`).
- Python 3.10+.
- Node.js 20+ (recommended to match CI).
- `just` (recommended task runner).

## Local Setup Summary

1. Copy backend env template:

```bash
cp backend/config/.template.env backend/config/.env
```

2. Start MySQL:

```bash
cd docker
docker compose up -d
```

3. Install backend dependencies:

```bash
just bootstrap
```

4. Run backend:

```bash
just run-backend
```

5. Run frontend (optional but recommended):

```bash
npm --prefix frontend install
just run-frontend
```

## Quality Gates

From repository root:

```bash
just check
just frontend-check
```

- `just check`: backend format check + lint + unit tests.
- `just frontend-check`: frontend prettier check + eslint + production build.

## Service URLs

- API health: `http://127.0.0.1:8000/api/`
- API docs (Swagger): `http://127.0.0.1:8000/api/docs`
- API docs (ReDoc): `http://127.0.0.1:8000/api/redoc`
- Frontend dev server: `http://127.0.0.1:5173`
