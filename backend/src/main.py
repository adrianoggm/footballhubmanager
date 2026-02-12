import logging
import os
import sys
import asyncio
from contextlib import asynccontextmanager

# Add src to path
sys.path.append(os.path.dirname(__file__))

if not logging.getLogger().handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from uvicorn import run

from app.config import config as app_config
from app.module import db_config, engine
from api.module import api_router

# Logger
logger = logging.getLogger(__name__)


def _resolve_allowed_hosts() -> list[str]:
    raw_hosts = os.getenv("ALLOWED_HOSTS")
    if raw_hosts:
        hosts = [host.strip() for host in raw_hosts.split(",") if host.strip()]
        if hosts:
            return hosts

    app_env = os.getenv("APP_ENV", "development").strip().lower()
    if app_env in {"dev", "development", "local", "test"}:
        return ["localhost", "127.0.0.1", "::1", "testserver"]
    return ["localhost"]


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
    redoc_url="/redoc"
)

# Middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=_resolve_allowed_hosts())

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

# Health check
@app.get("/")
async def health_check():
    return {"status": "ok", "service": "FootballHubManager API"}

# Placeholder for auth dependency (to be implemented)
# from auth.auth import get_current_user
# app.dependency_overrides[get_current_user] = get_current_user

# Include routers
app.include_router(api_router)

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
        log_level="info"
    )
