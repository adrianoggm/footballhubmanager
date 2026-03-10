import logging
from pathlib import Path

from pydantic import Field, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuration(BaseSettings):
    _backend_dir = Path(__file__).resolve().parents[2]
    model_config = SettingsConfigDict(
        env_file=[
            str(_backend_dir / "config" / ".local.env"),
            str(_backend_dir / "config" / ".env"),
        ],
        case_sensitive=False,
        extra="ignore",
    )

    APP_ENV: str = Field(default="development")
    SQL_ECHO: str | None = Field(default=None)

    DB_HOST: str
    DB_PORT: int
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str
    DB_PROVIDER: str = Field(default="mysql+pymysql")


def initialize_config() -> Configuration:
    try:
        return Configuration()
    except ValidationError as e:
        logger = logging.getLogger(__name__)
        logger.error("Persistence config validation error")
        logger.error(str(e))
        raise SystemExit(1)
