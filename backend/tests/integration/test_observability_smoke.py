"""Smoke test for the in-cluster observability stack.

Needs Prometheus and Loki reachable (port-forward — see deploy/helm/README.md). It
SKIPS, never fails, when they are unreachable, so it is safe to keep in the suite and
only does something once you have a cluster up. This is the test that is only
possible because local == prod (same stack both places).
"""

import json
import os
import urllib.error
import urllib.request

import pytest

PROM_URL = os.getenv("TEST_PROM_URL", "http://127.0.0.1:9090")
LOKI_URL = os.getenv("TEST_LOKI_URL", "http://127.0.0.1:3100")


def _get_json(url: str):
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
        pytest.skip(f"observability stack not reachable at {url}: {exc}")


def test_prometheus_sees_backend_target_up():
    data = _get_json(f"{PROM_URL}/api/v1/query?query=up")
    results = data["data"]["result"]

    # Some target labelled backend must be scraped and healthy.
    backend_up = [
        series
        for series in results
        if series["value"][1] == "1" and any("backend" in str(v) for v in series["metric"].values())
    ]
    assert backend_up, "no healthy backend target found in Prometheus `up`"


def test_loki_has_ingested_logs():
    # ponytail: label-names proves Loki is ingesting; tighten to a specific
    # {app=...} query if log labels ever need asserting.
    data = _get_json(f"{LOKI_URL}/loki/api/v1/labels")
    assert data.get("data"), "Loki reports no log labels — nothing ingested yet"
