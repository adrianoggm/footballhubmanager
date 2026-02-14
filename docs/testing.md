# Testing Guide

## Unit Tests

Run without integration suite:

```bash
cd backend
.venv/bin/python -m pytest tests --ignore=tests/integration -q
```

## Integration Tests

Requires backend listening on `127.0.0.1:8000` and a reachable MySQL database.

```bash
cd backend
.venv/bin/python -m pytest tests/integration -q
```

## CI-like Local Run

```bash
cd docker
docker compose -f docker-compose.ci.yml up -d --build
cd ../backend
TEST_API_ROOT=http://127.0.0.1:8000/api TEST_API_V1=http://127.0.0.1:8000/api/v1 .venv/bin/python -m pytest tests/integration -q
cd ../docker
docker compose -f docker-compose.ci.yml down -v
```

## Common Failures

### `ConnectionRefusedError: [Errno 111]`

The backend is not running on `127.0.0.1:8000`.

Check:

```bash
curl -i http://127.0.0.1:8000/api/
```

### Authentication/seed related failures in integration tests

If tests expect seeded users or penas, use the CI compose file with `ci_seed.sql` mounted.
