"""RequestIdMiddleware echoes X-Request-ID and honours an incoming one."""

import asyncio

from observability_logging import RequestIdMiddleware


async def _echo_app(scope, receive, send):
    await send({"type": "http.response.start", "status": 200, "headers": []})
    await send({"type": "http.response.body", "body": b"ok"})


def _get(headers):
    app = RequestIdMiddleware(_echo_app)
    scope = {"type": "http", "method": "GET", "path": "/", "headers": headers}
    captured = {}

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message):
        if message["type"] == "http.response.start":
            captured["headers"] = dict(message["headers"])

    asyncio.run(app(scope, receive, send))
    return captured["headers"]


def test_generates_request_id_when_absent():
    headers = _get([])
    assert b"x-request-id" in headers
    assert len(headers[b"x-request-id"]) > 0


def test_propagates_incoming_request_id():
    headers = _get([(b"x-request-id", b"abc-123")])
    assert headers[b"x-request-id"] == b"abc-123"
