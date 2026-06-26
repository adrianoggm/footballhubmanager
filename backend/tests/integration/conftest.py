"""Skip the integration suite cleanly when its dependencies aren't running.

The API-flow tests hit a live backend on :8000; without one, ``urlopen`` raises
``URLError`` (connection refused) and every test ERRORs with a traceback. That is
noise, not a failure — so probe the backend once and turn those into skips. The
observability smoke test talks to Prometheus/Loki instead and guards itself, so it is
exempt from this gate.
"""

import os
import urllib.error
import urllib.request

import pytest

API_ROOT = os.getenv("TEST_API_ROOT", "http://127.0.0.1:8000/api")

_SELF_GUARDED = ("test_observability_smoke",)


def _backend_up() -> bool:
    try:
        with urllib.request.urlopen(f"{API_ROOT}/", timeout=3) as resp:
            return resp.status == 200
    except (urllib.error.URLError, TimeoutError, OSError):
        return False


def pytest_collection_modifyitems(config, items):
    if _backend_up():
        return
    reason = f"backend not reachable at {API_ROOT} (start with `just backend`)"
    skip = pytest.mark.skip(reason=reason)
    for item in items:
        if any(name in str(item.fspath) for name in _SELF_GUARDED):
            continue
        item.add_marker(skip)
