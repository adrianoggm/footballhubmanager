set shell := ["bash", "-cu"]
set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

venv_python := if os_family() == "windows" { "backend/.venv/Scripts/python.exe" } else { "backend/.venv/bin/python" }
python_cmd := if os_family() == "windows" { "python" } else { "python3" }
host := "0.0.0.0"
port := "5173"

default:
    @just --list

bootstrap:
    {{python_cmd}} -m venv backend/.venv
    {{venv_python}} -m pip install --upgrade pip
    {{venv_python}} -m pip install -r backend/requirements.txt

install:
    {{venv_python}} -m pip install -r backend/requirements.txt

backend port="8000" host="0.0.0.0":
    {{venv_python}} -m uvicorn src.main:app --app-dir backend --host {{host}} --port {{port}} --reload

run-backend port="8000" host="0.0.0.0":
    {{venv_python}} -m uvicorn src.main:app --app-dir backend --host {{host}} --port {{port}} --reload

frontend *args:
    npx --prefix frontend vite --host {{host}} --port {{port}}

run-frontend *args:
    npx --prefix frontend vite --host {{host}} --port {{port}}

test-unit:
    {{venv_python}} -m pytest backend/tests --ignore=backend/tests/integration -q

test-integration:
    {{ if os_family() == "windows" { "$env:TEST_API_ROOT='http://127.0.0.1:8000/api'; $env:TEST_API_V1='http://127.0.0.1:8000/api/v1'; " } else { "TEST_API_ROOT=http://127.0.0.1:8000/api TEST_API_V1=http://127.0.0.1:8000/api/v1 " } }}{{venv_python}} -m pytest backend/tests/integration -q

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
