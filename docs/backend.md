# Backend Guide

## Stack

- Framework: FastAPI
- ORM: SQLAlchemy
- DB driver: PyMySQL
- Testing: pytest

## Architecture

The backend follows a hexagonal structure:

- Domain entities: `backend/src/persistence/domain/entity`
- Use cases: `backend/src/persistence/application/use_cases`
- Ports (interfaces): `backend/src/persistence/application/ports`
- Infrastructure adapters: `backend/src/persistence/infrastructure`
- HTTP controllers: `backend/src/api/interface/controller/v1`

Controllers should stay thin: validate input, invoke a use case, map errors to HTTP responses.

## Identifiers

API contracts expose GUIDs, not internal numeric IDs.

- Example: `/api/v1/penas/{pena_guid}`

## Environment Variables

Source files:

- Template: `backend/config/.template.env`
- Local overrides: `backend/config/.local.env` (optional)
- Main env: `backend/config/.env`

Most relevant variables:

- `APP_HOST`, `APP_PORT`, `APP_RELOAD`, `APP_ENV`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PROVIDER`
- `LINK_TOKEN_TTL_SECONDS`, `SESSION_TTL_SECONDS`
- `SQL_ECHO`
- `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CORS_ALLOW_CREDENTIALS`
- `DB_STARTUP_MAX_ATTEMPTS`, `DB_STARTUP_RETRY_SECONDS`

## Run Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

## Useful Commands

Run unit tests only:

```bash
cd backend
.venv/bin/python -m pytest tests --ignore=tests/integration -q
```

Run integration tests:

```bash
cd backend
.venv/bin/python -m pytest tests/integration -q
```
