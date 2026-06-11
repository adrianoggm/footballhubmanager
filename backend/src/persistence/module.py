from persistence.config import initialize_config
from persistence.infrastructure.entity import Base
from persistence.infrastructure.repository.db.repository import BaseRepository
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Initialize config
config = initialize_config()

# Database URL
DATABASE_URL = f"{config.DB_PROVIDER}://{config.DB_USER}:{config.DB_PASSWORD}@{config.DB_HOST}:{config.DB_PORT}/{config.DB_NAME}"


def _parse_bool(value: str | None) -> bool | None:
    if value is None:
        return None
    parsed = value.strip().lower()
    if parsed in {"1", "true", "yes", "on"}:
        return True
    if parsed in {"0", "false", "no", "off"}:
        return False
    return None


def _resolve_sql_echo() -> bool:
    explicit = _parse_bool(config.SQL_ECHO)
    if explicit is not None:
        return explicit
    app_env = config.APP_ENV.strip().lower()
    return app_env in {"dev", "development", "local", "test"}


engine = create_engine(DATABASE_URL, echo=_resolve_sql_echo())
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Tables are created via Docker init script, not here


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Exports
__all__ = ["config", "engine", "SessionLocal", "get_db", "Base", "BaseRepository"]
