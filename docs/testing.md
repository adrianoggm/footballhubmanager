# Testing Guide

## Backend Unit Tests

From repository root:

```bash
just test-unit
```

Direct command:

```bash
backend/.venv/bin/python -m pytest backend/tests --ignore=backend/tests/integration -q
```

## Backend Integration Tests

Requires backend + database available (local or CI-like stack).

From repository root:

```bash
just test-integration
```

Direct command:

```bash
TEST_API_ROOT=http://127.0.0.1:8000/api TEST_API_V1=http://127.0.0.1:8000/api/v1 backend/.venv/bin/python -m pytest backend/tests/integration -q
```

## Frontend Quality Checks

Run full frontend gate:

```bash
just frontend-check
```

Equivalent npm commands:

```bash
npm --prefix frontend run format:check
npm --prefix frontend run lint
npm --prefix frontend run build
```

## Full Local Quality Gate

Run backend + frontend checks:

```bash
just check
just frontend-check
```

## CI-like Local Integration Run

```bash
cd docker
docker compose -f docker-compose.ci.yml up -d --build
cd ..
TEST_API_ROOT=http://127.0.0.1:8000/api TEST_API_V1=http://127.0.0.1:8000/api/v1 backend/.venv/bin/python -m pytest backend/tests/integration -q
cd docker
docker compose -f docker-compose.ci.yml down -v
```

## Common Failures

### `ConnectionRefusedError: [Errno 111]`

Backend is not reachable at `127.0.0.1:8000`.

Check:

```bash
curl -i http://127.0.0.1:8000/api/
```

### Seed/auth related integration failures

If tests expect seeded users or peñas, run against `docker/docker-compose.ci.yml`
(which mounts `versioning/sql/ci_seed.sql`).
