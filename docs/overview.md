# Project Overview

PenaHub is a monorepo for managing football fan clubs (penas), members, seasons, and season competition.

## Repository Layout

- `backend/`: FastAPI service with hexagonal architecture.
- `frontend/`: React + Vite client app.
- `docker/`: Docker Compose files for local and CI environments.
- `versioning/sql/`: SQL schema and CI seed data.
- `.github/workflows/ci.yml`: CI jobs for unit and integration tests.

## Tech Stack

- Backend: Python, FastAPI, SQLAlchemy, PyMySQL, pytest.
- Frontend: React, Vite, Material UI.
- Database: MySQL 8.
- Container tooling: Docker Compose.

## Prerequisites

- Docker and Docker Compose plugin (`docker compose`).
- Python 3.10+.
- Node.js 18+.
- `just` (recommended task runner).

## Local Setup Summary

1. Copy env template:

```bash
cp backend/config/.template.env backend/config/.env
```

2. Start MySQL:

```bash
cd docker
docker compose up -d
```

3. Start backend:

```bash
cd ../backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

4. Optional: start frontend:

```bash
cd ../frontend
npm install
npm run dev
```

## Optional: Just-Based Workflow

From repository root:

```bash
just bootstrap
just run-backend
just test-unit
just check
```

## Service URLs

- API health: `http://127.0.0.1:8000/api/`
- API docs (Swagger): `http://127.0.0.1:8000/api/docs`
- API docs (ReDoc): `http://127.0.0.1:8000/api/redoc`
