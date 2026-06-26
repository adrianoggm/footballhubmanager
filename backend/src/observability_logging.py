"""Structured logging + request correlation.

JSON logs in the cluster so Loki/LogQL can filter by ``level``, ``request_id``, etc.
(``{app="fhm"} | json | level="ERROR"``), plain text in local dev where a terminal
reads better. Both carry the per-request id set by ``RequestIdMiddleware`` so every
line of one request shares a value you can grep on.
"""

import json
import logging
import uuid
from contextvars import ContextVar

_request_id: ContextVar[str] = ContextVar("request_id", default="-")


class _Formatter(logging.Formatter):
    def __init__(self, json_logs: bool):
        super().__init__("%(asctime)s %(levelname)s %(name)s [%(request_id)s] %(message)s")
        self._json = json_logs

    def format(self, record: logging.LogRecord) -> str:
        record.request_id = _request_id.get()
        if not self._json:
            return super().format(record)
        payload = {
            "ts": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "request_id": record.request_id,
            "msg": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_logging(*, json_logs: bool, level: int = logging.INFO) -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(_Formatter(json_logs))
    root = logging.getLogger()
    root.handlers[:] = [handler]
    root.setLevel(level)


class RequestIdMiddleware:
    """Pure-ASGI: bind a request id to the log context and echo it as X-Request-ID.

    Pure ASGI (not BaseHTTPMiddleware) so the ContextVar is set in the same task the
    endpoint runs in — BaseHTTPMiddleware runs dispatch in a separate task and the
    value would not propagate to handler logs.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = uuid.uuid4().hex
        for key, value in scope["headers"]:
            if key == b"x-request-id" and value:
                request_id = value.decode("latin-1")
                break

        async def send_with_id(message):
            if message["type"] == "http.response.start":
                headers = message.setdefault("headers", [])
                headers.append((b"x-request-id", request_id.encode("latin-1")))
            await send(message)

        token = _request_id.set(request_id)
        try:
            await self.app(scope, receive, send_with_id)
        finally:
            _request_id.reset(token)
