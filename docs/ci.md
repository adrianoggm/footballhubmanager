# CI Pipeline

Workflow file: `.github/workflows/ci.yml`

## Jobs

- `lint` (backend ruff checks)
- `frontend-quality` (prettier check + eslint + build)
- `unit-tests` (backend pytest matrix)
- `integration-tests` (containerized backend + MySQL + integration suite)

## Backend Lint Job

Runs on `ubuntu-latest` with Python `3.12`:

```bash
python -m ruff check backend/src backend/tests
python -m ruff format --check backend/src backend/tests
```

## Frontend Quality Job

Runs on `ubuntu-latest` with Node `20` and npm cache from `frontend/package-lock.json`:

```bash
npm ci --prefix frontend
npm --prefix frontend run format:check
npm --prefix frontend run lint
npm --prefix frontend run build
```

## Unit Test Matrix

- OS: `ubuntu-latest`, `windows-latest`
- Python: `3.10`, `3.11`, `3.12`, `3.13`

Command:

```bash
python -m pytest backend/tests --ignore=backend/tests/integration -q
```

## Integration Test Matrix

- OS: `ubuntu-latest`
- Python: `3.10`, `3.11`, `3.12`, `3.13`

Stack startup:

```bash
docker compose -f docker/docker-compose.ci.yml up -d --build
```

Health probe target:

- `http://127.0.0.1:8000/api/`

Test command:

```bash
python -m pytest backend/tests/integration -q
```

Environment variables used in CI for integration tests:

- `TEST_API_ROOT=http://127.0.0.1:8000/api`
- `TEST_API_V1=http://127.0.0.1:8000/api/v1`

Teardown:

```bash
docker compose -f docker/docker-compose.ci.yml down -v
```
