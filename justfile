python_cmd := env_var_or_default("PYTHON_CMD", if os() == "windows" { "py -3" } else { "python3" })
venv_python := env_var_or_default("VENV_PYTHON", if os() == "windows" { "backend/.venv/Scripts/python.exe" } else { "backend/.venv/bin/python" })

default:
    @just --list

bootstrap:
    {{python_cmd}} -m venv backend/.venv
    {{venv_python}} -m pip install --upgrade pip
    {{venv_python}} -m pip install -r backend/requirements.txt

install:
    {{venv_python}} -m pip install -r backend/requirements.txt

backend port="8000" host="127.0.0.1":
    {{venv_python}} -m uvicorn src.main:app --app-dir backend --host {{host}} --port {{port}} --reload

run-backend port="8000" host="127.0.0.1":
    {{venv_python}} -m uvicorn src.main:app --app-dir backend --host {{host}} --port {{port}} --reload

frontend port="5173" host="127.0.0.1":
    npm --prefix frontend run dev -- --host {{host}} --port {{port}}

run-frontend port="5173" host="127.0.0.1":
    npm --prefix frontend run dev -- --host {{host}} --port {{port}}

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

test-unit:
    {{venv_python}} -m pytest backend/tests --ignore=backend/tests/integration -q

test-integration:
    {{venv_python}} -m pytest backend/tests/integration -q

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
