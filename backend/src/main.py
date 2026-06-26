import asyncio
import logging
import os
import sys
from contextlib import asynccontextmanager

# Add src to path
sys.path.append(os.path.dirname(__file__))

if not logging.getLogger().handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

from api.middleware.rate_limit import RateLimitConfig, RateLimitMiddleware, RateLimitRule
from api.module import api_router
from app.config import config as app_config
from app.module import engine
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import text
from uvicorn import run

# Logger
logger = logging.getLogger(__name__)


def _app_env() -> str:
    return os.getenv("APP_ENV", "production").strip().lower()


def _env_bool(name: str, *, default: bool) -> bool:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    return raw_value.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, *, default: int, minimum: int = 1) -> int:
    raw_value = os.getenv(name)
    try:
        value = int(raw_value) if raw_value is not None else default
    except ValueError:
        value = default
    return max(minimum, value)


def _resolve_allowed_hosts() -> list[str]:
    raw_hosts = os.getenv("ALLOWED_HOSTS")
    if raw_hosts:
        hosts = [host.strip() for host in raw_hosts.split(",") if host.strip()]
        if hosts:
            return hosts

    app_env = _app_env()
    if app_env in {"dev", "development", "local", "test"}:
        return ["localhost", "127.0.0.1", "::1", "testserver"]
    return ["localhost"]


def _resolve_cors_origins() -> list[str]:
    raw_origins = os.getenv("CORS_ALLOWED_ORIGINS")
    if raw_origins:
        origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
        if origins:
            return origins

    app_env = _app_env()
    if app_env in {"dev", "development", "local", "test"}:
        return [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    return []


def _resolve_cors_allow_credentials(origins: list[str]) -> bool:
    allow_credentials = _env_bool("CORS_ALLOW_CREDENTIALS", default=False)

    # Browsers reject '*' when credentials are enabled, and it is insecure.
    if allow_credentials and "*" in origins:
        logger.warning("CORS_ALLOW_CREDENTIALS ignored because CORS_ALLOWED_ORIGINS contains '*'.")
        return False
    return allow_credentials


def _include_debug_error_detail() -> bool:
    if not _env_bool("EXPOSE_INTERNAL_ERRORS", default=False):
        return False

    app_env = _app_env()
    return app_env in {"dev", "development", "local", "test"}


def _resolve_rate_limit_config() -> RateLimitConfig:
    return RateLimitConfig(
        enabled=_env_bool("RATE_LIMIT_ENABLED", default=True),
        default_rule=RateLimitRule(
            max_requests=_env_int("RATE_LIMIT_REQUESTS", default=300),
            window_seconds=_env_int("RATE_LIMIT_WINDOW_SECONDS", default=60),
        ),
        auth_rule=RateLimitRule(
            max_requests=_env_int("RATE_LIMIT_AUTH_REQUESTS", default=20),
            window_seconds=_env_int("RATE_LIMIT_WINDOW_SECONDS", default=60),
        ),
    )


def _db_startup_retries() -> tuple[int, float]:
    attempts_raw = os.getenv("DB_STARTUP_MAX_ATTEMPTS", "30")
    delay_raw = os.getenv("DB_STARTUP_RETRY_SECONDS", "1")
    try:
        attempts = int(attempts_raw)
    except ValueError:
        attempts = 30
    try:
        delay = float(delay_raw)
    except ValueError:
        delay = 1.0
    return max(1, attempts), max(0.1, delay)


def _strict_migration_check() -> bool:
    raw = os.getenv("STRICT_MIGRATION_CHECK")
    return raw is not None and raw.strip().lower() in {"1", "true", "yes", "on"}


def _verify_schema_migrations() -> None:
    """Read-only check that the database schema is at head.

    Migrations are applied out-of-band (the Kubernetes pre-upgrade Job runs the
    ``migrate`` command), never by the API process. Here we only verify: when
    ``STRICT_MIGRATION_CHECK`` is enabled we refuse to start against a stale schema
    (fail fast and loud) instead of letting requests error at runtime; otherwise we
    log a warning. Any problem reaching the migration metadata is non-fatal.
    """
    try:
        from db_migrations import runner

        migrations, applied = runner.status(engine)
    except Exception as exc:
        logger.warning("Skipped schema migration check: %s", exc)
        return

    pending = [migration.version for migration in migrations if migration.version not in applied]
    if not pending:
        logger.info("Schema is up to date (%s migration(s) applied).", len(applied))
        return

    message = f"Pending schema migrations: {', '.join(pending)}. Apply the migrate job."
    if _strict_migration_check():
        logger.error(message)
        raise RuntimeError(message)
    logger.warning(message)


# Lifespan for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting FootballHubManager API")
    max_attempts, retry_delay_seconds = _db_startup_retries()
    last_error: Exception | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            # Test DB connection
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Database connection successful (attempt %s/%s)", attempt, max_attempts)
            last_error = None
            break
        except Exception as exc:  # pragma: no cover - exercised in container startup
            last_error = exc
            if attempt == max_attempts:
                break
            logger.warning(
                "Database connection attempt %s/%s failed: %s. Retrying in %.1fs",
                attempt,
                max_attempts,
                exc,
                retry_delay_seconds,
            )
            await asyncio.sleep(retry_delay_seconds)

    if last_error is not None:
        logger.error("Database connection failed after %s attempts: %s", max_attempts, last_error)
        raise last_error

    _verify_schema_migrations()

    yield

    # Shutdown
    logger.info("Shutting down FootballHubManager API")


# Create FastAPI app
app = FastAPI(
    title="FootballHubManager API",
    description="API for managing football fan clubs",
    version="1.0.0",
    root_path="/api",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Middleware. Starlette runs the LAST-added middleware outermost, so CORS must be
# added last: otherwise short-circuit responses (e.g. a 429 from the rate limiter,
# a 400 from TrustedHost) skip CORS and reach browsers without Access-Control
# headers, surfacing as an opaque CORS error instead of the real status.
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(RateLimitMiddleware, config=_resolve_rate_limit_config())
app.add_middleware(TrustedHostMiddleware, allowed_hosts=_resolve_allowed_hosts())
# Prometheus metrics. instrument() adds the metrics middleware; it must go on
# before CORS so CORS stays the outermost layer (see the ordering note above).
# The /metrics route is added by expose() after the routers, below.
_instrumentator = Instrumentator().instrument(app)
cors_origins = _resolve_cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=_resolve_cors_allow_credentials(cors_origins),
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(
        "Unhandled exception for %s %s",
        request.method,
        request.url.path,
    )
    detail = "Internal server error"
    if _include_debug_error_detail():
        detail = f"{exc.__class__.__name__}: {exc}"
    return JSONResponse(status_code=500, content={"detail": detail})


# Health check
@app.get("/")
async def health_check():
    return {"status": "ok", "service": "FootballHubManager API"}


# Placeholder for auth dependency (to be implemented)
# from auth.auth import get_current_user
# app.dependency_overrides[get_current_user] = get_current_user

# Include routers
app.include_router(api_router)

# Expose GET /metrics (Prometheus scrape target). Kept out of the OpenAPI schema.
_instrumentator.expose(app, include_in_schema=False)

if __name__ == "__main__":
    logger.info(
        "Starting server on %s:%s",
        app_config.APP_HOST,
        app_config.APP_PORT,
    )
    run(
        "main:app",
        host=app_config.APP_HOST,
        port=app_config.APP_PORT,
        reload=app_config.APP_RELOAD,
        log_level="info",
        # TLS terminates at the ingress; trust its forwarded headers so the app
        # sees the real scheme (https) and client IP instead of the proxy's.
        proxy_headers=True,
        forwarded_allow_ips=os.getenv("FORWARDED_ALLOW_IPS", "*"),
    )
