import asyncio

from api.middleware.rate_limit import RateLimitRule, SlidingWindowRateLimiter


def test_sliding_window_rate_limiter_blocks_until_window_expires():
    current_time = 100.0
    limiter = SlidingWindowRateLimiter(clock=lambda: current_time)
    rule = RateLimitRule(max_requests=2, window_seconds=10)

    first = limiter.check("127.0.0.1:auth", rule)
    second = limiter.check("127.0.0.1:auth", rule)
    third = limiter.check("127.0.0.1:auth", rule)

    assert first.allowed is True
    assert first.remaining == 1
    assert second.allowed is True
    assert second.remaining == 0
    assert third.allowed is False
    assert third.retry_after_seconds == 10

    current_time = 111.0
    after_window = limiter.check("127.0.0.1:auth", rule)

    assert after_window.allowed is True
    assert after_window.remaining == 1


def test_sliding_window_rate_limiter_is_scoped_by_key():
    limiter = SlidingWindowRateLimiter(clock=lambda: 100.0)
    rule = RateLimitRule(max_requests=1, window_seconds=10)

    assert limiter.check("127.0.0.1:auth", rule).allowed is True
    assert limiter.check("127.0.0.2:auth", rule).allowed is True
    assert limiter.check("127.0.0.1:auth", rule).allowed is False


def test_sweep_evicts_idle_keys_without_dropping_active_ones():
    current_time = 100.0
    limiter = SlidingWindowRateLimiter(clock=lambda: current_time)
    limiter._SWEEP_EVERY = 1  # sweep on every check for the test
    rule = RateLimitRule(max_requests=5, window_seconds=10)

    limiter.check("idle:auth", rule)
    assert "idle:auth" in limiter._hits

    # Advance past the window so idle's bucket is fully expired, then touch another
    # key to trigger a sweep. The idle key is evicted; the active one survives.
    current_time = 200.0
    limiter.check("active:auth", rule)

    assert "idle:auth" not in limiter._hits
    assert "active:auth" in limiter._hits


def test_rate_limit_middleware_rejects_when_limiter_denies():
    from api.middleware.rate_limit import RateLimitConfig, RateLimitMiddleware
    from starlette.requests import Request
    from starlette.responses import JSONResponse

    class _Limiter:
        def check(self, key, rule):
            from api.middleware.rate_limit import RateLimitDecision

            assert key == "127.0.0.1:auth"
            assert rule.max_requests == 1
            return RateLimitDecision(allowed=False, remaining=0, retry_after_seconds=7)

    async def _call_next(_request):
        return JSONResponse({"ok": True})

    request = Request(
        {
            "type": "http",
            "http_version": "1.1",
            "method": "POST",
            "scheme": "http",
            "path": "/v1/auth/login",
            "raw_path": b"/v1/auth/login",
            "query_string": b"",
            "headers": [],
            "client": ("127.0.0.1", 12345),
            "server": ("testserver", 80),
        }
    )
    middleware = RateLimitMiddleware(
        app=object(),
        config=RateLimitConfig(
            enabled=True,
            default_rule=RateLimitRule(max_requests=10, window_seconds=60),
            auth_rule=RateLimitRule(max_requests=1, window_seconds=60),
        ),
        limiter=_Limiter(),
    )

    response = asyncio.run(middleware.dispatch(request, _call_next))

    assert response.status_code == 429
    assert response.headers["Retry-After"] == "7"
    assert response.headers["X-RateLimit-Remaining"] == "0"
