import asyncio
import os

from starlette.requests import Request

# Required so importing `main` does not fail during test collection.
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "3306")
os.environ.setdefault("DB_NAME", "footballhub")
os.environ.setdefault("DB_USER", "footballuser")
os.environ.setdefault("DB_PASSWORD", "footballpass")

from main import (
    _include_debug_error_detail,
    _resolve_cors_allow_credentials,
    _resolve_cors_origins,
    global_exception_handler,
)


def _request_for_tests(path: str = "/boom") -> Request:
    return Request(
        {
            "type": "http",
            "http_version": "1.1",
            "method": "GET",
            "scheme": "http",
            "path": path,
            "raw_path": path.encode("utf-8"),
            "query_string": b"",
            "headers": [],
            "client": ("127.0.0.1", 12345),
            "server": ("testserver", 80),
        }
    )


def test_resolve_cors_origins_uses_dev_defaults(monkeypatch):
    monkeypatch.delenv("CORS_ALLOWED_ORIGINS", raising=False)
    monkeypatch.setenv("APP_ENV", "test")

    origins = _resolve_cors_origins()

    assert "http://localhost:3000" in origins
    assert "http://127.0.0.1:5173" in origins


def test_resolve_cors_origins_uses_explicit_env(monkeypatch):
    monkeypatch.setenv(
        "CORS_ALLOWED_ORIGINS", "https://app.example.com, https://admin.example.com "
    )

    origins = _resolve_cors_origins()

    assert origins == ["https://app.example.com", "https://admin.example.com"]


def test_resolve_cors_allow_credentials_disables_with_wildcard(monkeypatch):
    monkeypatch.setenv("CORS_ALLOW_CREDENTIALS", "true")

    allow_credentials = _resolve_cors_allow_credentials(["*"])

    assert allow_credentials is False


def test_include_debug_error_detail_depends_on_env(monkeypatch):
    monkeypatch.setenv("APP_ENV", "test")
    assert _include_debug_error_detail() is True

    monkeypatch.setenv("APP_ENV", "production")
    assert _include_debug_error_detail() is False


def test_global_exception_handler_returns_detailed_error_in_test(monkeypatch):
    monkeypatch.setenv("APP_ENV", "test")

    response = asyncio.run(global_exception_handler(_request_for_tests(), ValueError("boom")))

    assert response.status_code == 500
    assert b"ValueError: boom" in response.body


def test_global_exception_handler_returns_generic_error_in_production(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")

    response = asyncio.run(global_exception_handler(_request_for_tests(), ValueError("boom")))

    assert response.status_code == 500
    assert response.body == b'{"detail":"Internal server error"}'
