# CI Pipeline

Workflow file: `.github/workflows/ci.yml`

## Jobs

- `lint` (backend ruff checks)
- `frontend-quality` (prettier check + eslint + build)
- `unit-tests` (backend pytest matrix)
- `unit-tests-coverage-report` (coverage + failed-test summary + artifacts)
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

## Unit Test Coverage Report Job

Runs on `ubuntu-latest` with Python `3.12`.

Main test command:

```bash
python -m pytest backend/tests --ignore=backend/tests/integration -q \
  --cov=backend/src \
  --cov-report=term-missing \
  --cov-report=xml:backend/coverage.xml \
  --cov-report=html:backend/htmlcov \
  --junitxml=backend/junit-unit.xml
```

This job writes a GitHub Actions `Job Summary` with:

- line and branch coverage percentages
- total/passed/failed/error/skipped test counts
- explicit list of failed tests (up to 50 entries)

Uploaded artifacts:

- `backend/coverage.xml`
- `backend/junit-unit.xml`
- `backend/pytest-unit.log`
- `backend/htmlcov/`

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
