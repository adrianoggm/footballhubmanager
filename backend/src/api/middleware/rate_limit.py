import math
import time
from collections import deque
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from threading import Lock

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response


@dataclass(frozen=True)
class RateLimitRule:
    max_requests: int
    window_seconds: int


@dataclass(frozen=True)
class RateLimitConfig:
    enabled: bool
    default_rule: RateLimitRule
    auth_rule: RateLimitRule


@dataclass(frozen=True)
class RateLimitDecision:
    allowed: bool
    remaining: int
    retry_after_seconds: int


class SlidingWindowRateLimiter:
    def __init__(self, clock: Callable[[], float] = time.monotonic):
        self._clock = clock
        self._hits: dict[str, deque[float]] = {}
        self._lock = Lock()

    def check(self, key: str, rule: RateLimitRule) -> RateLimitDecision:
        now = self._clock()
        window_seconds = max(1, rule.window_seconds)
        max_requests = max(1, rule.max_requests)
        cutoff = now - window_seconds

        with self._lock:
            bucket = self._hits.setdefault(key, deque())
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()

            if len(bucket) >= max_requests:
                retry_after = max(1, math.ceil(bucket[0] + window_seconds - now))
                return RateLimitDecision(
                    allowed=False,
                    remaining=0,
                    retry_after_seconds=retry_after,
                )

            bucket.append(now)
            return RateLimitDecision(
                allowed=True,
                remaining=max_requests - len(bucket),
                retry_after_seconds=0,
            )


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        config: RateLimitConfig,
        limiter: SlidingWindowRateLimiter | None = None,
    ):
        super().__init__(app)
        self._config = config
        self._limiter = limiter or SlidingWindowRateLimiter()

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if not self._config.enabled or request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path
        if self._is_exempt_path(path):
            return await call_next(request)

        rule_name, rule = self._select_rule(path)
        client_host = request.client.host if request.client else "unknown"
        decision = self._limiter.check(f"{client_host}:{rule_name}", rule)
        if not decision.allowed:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests"},
                headers={
                    "Retry-After": str(decision.retry_after_seconds),
                    "X-RateLimit-Limit": str(rule.max_requests),
                    "X-RateLimit-Remaining": "0",
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(rule.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(decision.remaining)
        return response

    @staticmethod
    def _is_exempt_path(path: str) -> bool:
        return path in {
            "/",
            "/api",
            "/api/",
            "/docs",
            "/api/docs",
            "/redoc",
            "/api/redoc",
            "/openapi.json",
            "/api/openapi.json",
        }

    def _select_rule(self, path: str) -> tuple[str, RateLimitRule]:
        if "/auth/" in path:
            return "auth", self._config.auth_rule
        return "default", self._config.default_rule
