"""The Prometheus scrape endpoint is wired and exposes the expected metrics.

Driven straight through the ASGI app (no httpx/TestClient — the repo has neither),
matching the existing tests that build scopes by hand. The path asserted is the one
the pod actually serves behind ``root_path="/api"`` (probes hit ``/api/``), which is
what the ServiceMonitor scrapes.
"""

import asyncio
import os

os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "3306")
os.environ.setdefault("DB_NAME", "footballhub")
os.environ.setdefault("DB_USER", "footballuser")
os.environ.setdefault("DB_PASSWORD", "footballpass")

from main import app

METRICS_PATH = "/api/metrics"


def _asgi_get(path: str) -> tuple[int, bytes]:
    # No accept-encoding header -> GZipMiddleware leaves the body as plain text.
    scope = {
        "type": "http",
        "http_version": "1.1",
        "method": "GET",
        "scheme": "http",
        "path": path,
        "raw_path": path.encode("utf-8"),
        "query_string": b"",
        "headers": [(b"host", b"localhost")],  # passes TrustedHostMiddleware
        "client": ("127.0.0.1", 1),
        "server": ("localhost", 80),
    }
    messages: list[dict] = []

    async def receive() -> dict:
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message: dict) -> None:
        messages.append(message)

    asyncio.run(app(scope, receive, send))

    status = next(m["status"] for m in messages if m["type"] == "http.response.start")
    body = b"".join(m.get("body", b"") for m in messages if m["type"] == "http.response.body")
    return status, body


def test_metrics_endpoint_exposes_http_request_metrics():
    status, body = _asgi_get(METRICS_PATH)

    assert status == 200
    # Default instrumentation: request counter + latency histogram.
    assert b"http_request" in body
