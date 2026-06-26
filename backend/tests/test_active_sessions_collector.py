"""ActiveSessionsCollector reports the count and degrades without raising."""

import os

os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "3306")
os.environ.setdefault("DB_NAME", "footballhub")
os.environ.setdefault("DB_USER", "footballuser")
os.environ.setdefault("DB_PASSWORD", "footballpass")

from metrics_collectors import ActiveSessionsCollector, register_once
from prometheus_client import CollectorRegistry


class _FakeResult:
    def __init__(self, value):
        self._value = value

    def scalar_one(self):
        return self._value


class _FakeSession:
    def __init__(self, value):
        self._value = value

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def execute(self, *args, **kwargs):
        return _FakeResult(self._value)


def _sample_value(collector):
    families = list(collector.collect())
    family = next(f for f in families if f.name == "footballhub_active_sessions")
    return family.samples


def test_reports_active_session_count():
    collector = ActiveSessionsCollector(lambda: _FakeSession(3))

    samples = _sample_value(collector)

    assert len(samples) == 1
    assert samples[0].value == 3.0


def test_db_failure_drops_sample_without_raising():
    def boom():
        raise RuntimeError("db down")

    collector = ActiveSessionsCollector(boom)

    # Must not raise — a scrape can't 500 because the DB blipped.
    samples = _sample_value(collector)

    assert samples == []  # metric still declared, just no value this scrape


def test_register_once_tolerates_duplicate():
    # Mirrors the __main__ + uvicorn double-import: registering twice must not raise.
    # auto_describe=True matches the global prometheus_client.REGISTRY, where the
    # duplicate is actually detected (it extracts names via collect() at register).
    registry = CollectorRegistry(auto_describe=True)
    register_once(registry, ActiveSessionsCollector(lambda: _FakeSession(0)))
    register_once(registry, ActiveSessionsCollector(lambda: _FakeSession(0)))

    assert "footballhub_active_sessions" in registry._names_to_collectors
