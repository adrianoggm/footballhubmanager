set shell := ["bash", "-cu"]

venv_python := "backend/.venv/bin/python"

default:
    @just --list

bootstrap:
    python3 -m venv backend/.venv
    {{venv_python}} -m pip install --upgrade pip
    {{venv_python}} -m pip install -r backend/requirements.txt

install:
    {{venv_python}} -m pip install -r backend/requirements.txt

run-backend:
    {{venv_python}} -m uvicorn src.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload

test-unit:
    {{venv_python}} -m pytest backend/tests --ignore=backend/tests/integration -q

test-integration:
    TEST_API_ROOT=http://127.0.0.1:8000/api TEST_API_V1=http://127.0.0.1:8000/api/v1 {{venv_python}} -m pytest backend/tests/integration -q

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
