set shell := ["bash", "-cu"]
set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

python_cmd := env_var_or_default("PYTHON_CMD", if os() == "windows" { "py -3" } else { "python3" })
venv_python := env_var_or_default("VENV_PYTHON", if os() == "windows" { "backend/.venv/Scripts/python.exe" } else { "backend/.venv/bin/python" })

default:
    @just --list

install-hooks:
    git config core.hooksPath .githooks

hooks-status:
    @printf "core.hooksPath=%s\n" "$$(git config --get core.hooksPath || echo .git/hooks)"

bootstrap:
    {{python_cmd}} -m venv backend/.venv
    {{venv_python}} -m pip install --upgrade pip
    {{venv_python}} -m pip install -r backend/requirements.txt

install:
    {{venv_python}} -m pip install -r backend/requirements.txt

db-up:
    docker compose -f docker/docker-compose.yml up -d

db-down:
    docker compose -f docker/docker-compose.yml down

# Recreate the database from scratch (drops the data volume and re-runs the init SQL).
db-reset:
    docker compose -f docker/docker-compose.yml down -v
    docker compose -f docker/docker-compose.yml up -d

db-logs:
    docker compose -f docker/docker-compose.yml logs -f mysql

# Show which schema migrations are applied vs pending.
db-status:
    {{venv_python}} backend/manage.py status

# Apply all pending migrations (versioning/sql/versions/vN.sql) to the configured DB.
db-migrate:
    {{venv_python}} backend/manage.py migrate

# Baseline an existing DB: mark migrations as applied WITHOUT running them.
# Optionally cap with a version, e.g. `just db-stamp 11`.
db-stamp version="":
    {{venv_python}} backend/manage.py stamp {{version}}

backend port="8000" host="127.0.0.1":
    {{venv_python}} -m uvicorn src.main:app --app-dir backend --host {{host}} --port {{port}} --reload

run-backend port="8000" host="127.0.0.1":
    {{venv_python}} -m uvicorn src.main:app --app-dir backend --host {{host}} --port {{port}} --reload

frontend port="5173" host="127.0.0.1":
    cd frontend; npx vite --host {{host}} --port {{port}}

run-frontend port="5173" host="127.0.0.1":
    cd frontend; npx vite --host {{host}} --port {{port}}

frontend-lint:
    npm --prefix frontend run lint

frontend-lint-fix:
    npm --prefix frontend run lint:fix

frontend-format:
    npm --prefix frontend run format

frontend-format-check:
    npm --prefix frontend run format:check

frontend-check:
    @just frontend-format-check
    @just frontend-lint
    npm --prefix frontend run build

frontend-fix:
    npm --prefix frontend run lint:fix
    npm --prefix frontend run format

test-unit:
    {{venv_python}} -m pytest backend/tests --ignore=backend/tests/integration -q

test-unit-coverage:
    {{venv_python}} -m pytest backend/tests --ignore=backend/tests/integration -q --cov=backend/src --cov-report=term-missing --cov-report=xml:backend/coverage.xml

test-unit-coverage-html:
    {{venv_python}} -m pytest backend/tests --ignore=backend/tests/integration -q --cov=backend/src --cov-report=term-missing --cov-report=xml:backend/coverage.xml --cov-report=html:backend/htmlcov

test-integration:
    {{venv_python}} -m pytest backend/tests/integration -q

test-all:
    @just test-unit
    @just test-integration

lint:
    {{venv_python}} -m ruff check backend/src backend/tests

lint-fix:
    {{venv_python}} -m ruff check --fix backend/src backend/tests

format:
    {{venv_python}} -m ruff format backend/src backend/tests

format-check:
    {{venv_python}} -m ruff format --check backend/src backend/tests

check:
    @just format-check
    @just lint
    @just test-unit

backend-fix:
    {{venv_python}} -m ruff check --fix backend/src backend/tests
    {{venv_python}} -m ruff format backend/src backend/tests

quality-all:
    @just format-check
    @just lint
    @just frontend-format-check
    @just frontend-lint

quality-fix-all:
    @just backend-fix
    @just frontend-fix
    @just quality-all
