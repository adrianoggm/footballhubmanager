# CI Pipeline

Workflow file: `.github/workflows/ci.yml`

## Jobs

- `lint`
- `unit-tests`
- `integration-tests`

## Lint

- Uses `ruff` on backend code (`ruff check` + `ruff format --check`):

```bash
python -m ruff check backend/src backend/tests
python -m ruff format --check backend/src backend/tests
```

## Unit Test Matrix

- OS: `ubuntu-latest`, `windows-latest`
- Python: `3.10`, `3.11`, `3.12`, `3.13`
- Command:

```bash
python -m pytest backend/tests --ignore=backend/tests/integration -q
```

## Integration Test Matrix

- OS: `ubuntu-latest`
- Python: `3.10`, `3.11`, `3.12`, `3.13`
- Uses Docker Compose CI stack:

```bash
docker compose -f docker/docker-compose.ci.yml up -d --build
```

- Health check target: `http://127.0.0.1:8000/api/`
- Test command:

```bash
python -m pytest backend/tests/integration -q
``` 

- Always tears down containers with:

```bash
docker compose -f docker/docker-compose.ci.yml down -v
```
