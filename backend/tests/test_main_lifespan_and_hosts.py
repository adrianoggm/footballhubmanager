import asyncio

import pytest
from main import _db_startup_retries, _resolve_allowed_hosts, lifespan


class _Connection:
    def __init__(self):
        self.executed_statements: list[object] = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, statement):
        self.executed_statements.append(statement)


def test_resolve_allowed_hosts_uses_explicit_env(monkeypatch):
    monkeypatch.setenv("ALLOWED_HOSTS", "api.example.com, app.example.com ,  ")
    hosts = _resolve_allowed_hosts()
    assert hosts[:2] == ["api.example.com", "app.example.com"]
    # Loopback is always appended so health probes pass.
    assert "localhost" in hosts and "127.0.0.1" in hosts


def test_resolve_allowed_hosts_uses_dev_defaults(monkeypatch):
    monkeypatch.delenv("ALLOWED_HOSTS", raising=False)
    monkeypatch.setenv("APP_ENV", "test")
    hosts = _resolve_allowed_hosts()
    assert "localhost" in hosts
    assert "127.0.0.1" in hosts
    assert "testserver" in hosts


def test_resolve_allowed_hosts_uses_safe_prod_default(monkeypatch):
    monkeypatch.delenv("ALLOWED_HOSTS", raising=False)
    monkeypatch.setenv("APP_ENV", "production")
    # Prod denies by default except loopback (for health probes); no public host.
    assert _resolve_allowed_hosts() == ["localhost", "127.0.0.1"]


def test_db_startup_retries_parses_and_clamps(monkeypatch):
    monkeypatch.setenv("DB_STARTUP_MAX_ATTEMPTS", "-5")
    monkeypatch.setenv("DB_STARTUP_RETRY_SECONDS", "0")
    attempts, delay = _db_startup_retries()
    assert attempts == 1
    assert delay == 0.1


def test_db_startup_retries_falls_back_on_invalid_values(monkeypatch):
    monkeypatch.setenv("DB_STARTUP_MAX_ATTEMPTS", "oops")
    monkeypatch.setenv("DB_STARTUP_RETRY_SECONDS", "nanx")
    attempts, delay = _db_startup_retries()
    assert attempts == 30
    assert delay == 1.0


def test_lifespan_starts_and_stops_when_db_is_available(monkeypatch):
    class _Engine:
        def __init__(self):
            self.connect_calls = 0

        def connect(self):
            self.connect_calls += 1
            return _Connection()

    engine = _Engine()
    monkeypatch.setattr("main.engine", engine)
    monkeypatch.setattr("main._db_startup_retries", lambda: (2, 0.01))

    async def _run():
        async with lifespan(object()):
            pass

    asyncio.run(_run())
    assert engine.connect_calls == 1


def test_lifespan_retries_before_success(monkeypatch):
    class _Engine:
        def __init__(self):
            self.connect_calls = 0

        def connect(self):
            self.connect_calls += 1
            if self.connect_calls == 1:
                raise RuntimeError("db down")
            return _Connection()

    sleeps: list[float] = []

    async def _fake_sleep(seconds: float):
        sleeps.append(seconds)

    engine = _Engine()
    monkeypatch.setattr("main.engine", engine)
    monkeypatch.setattr("main._db_startup_retries", lambda: (3, 0.25))
    monkeypatch.setattr("main.asyncio.sleep", _fake_sleep)

    async def _run():
        async with lifespan(object()):
            pass

    asyncio.run(_run())

    assert engine.connect_calls == 2
    assert sleeps == [0.25]


def test_lifespan_raises_last_error_after_max_attempts(monkeypatch):
    class _Engine:
        def __init__(self):
            self.connect_calls = 0

        def connect(self):
            self.connect_calls += 1
            raise RuntimeError(f"db down {self.connect_calls}")

    sleeps: list[float] = []

    async def _fake_sleep(seconds: float):
        sleeps.append(seconds)

    engine = _Engine()
    monkeypatch.setattr("main.engine", engine)
    monkeypatch.setattr("main._db_startup_retries", lambda: (2, 0.5))
    monkeypatch.setattr("main.asyncio.sleep", _fake_sleep)

    async def _run():
        async with lifespan(object()):
            pass

    with pytest.raises(RuntimeError, match="db down 2"):
        asyncio.run(_run())

    assert engine.connect_calls == 2
    assert sleeps == [0.5]
