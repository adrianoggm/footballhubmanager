import logging
import os
import sys
from contextlib import asynccontextmanager

# Add src to path
sys.path.append(os.path.dirname(__file__))

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

# Lifespan for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting FootballHubManager API")
    try:
        # Test DB connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection successful")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise

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
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])  # Configure for production

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
    port = int(os.getenv("PORT", 8000))
    logger.info(f"Starting server on port {port}")
    run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
