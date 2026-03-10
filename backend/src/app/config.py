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

    APP_HOST: str = Field(default="0.0.0.0")
    APP_PORT: int = Field(default=8000, ge=1, le=65535)
    APP_RELOAD: bool = Field(default=True)
    LINK_TOKEN_TTL_SECONDS: int = Field(default=86400, ge=60)


def initialize_config() -> Configuration:
    try:
        return Configuration()
    except ValidationError as e:
        logger = logging.getLogger(__name__)
        logger.error("Config validation error")
        logger.error(str(e))
        raise SystemExit(1)


# Initialize config
config = initialize_config()
