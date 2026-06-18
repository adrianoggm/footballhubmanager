import logging
from pathlib import Path

from dotenv import load_dotenv
from pydantic import Field, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parents[2]
_ENV_FILES = [
    str(_BACKEND_DIR / "config" / ".local.env"),
    str(_BACKEND_DIR / "config" / ".env"),
]

# Also load the .env files into os.environ so settings read via os.getenv
# (not just the typed Configuration below) work in local runs. override=False
# keeps real env vars and test monkeypatching authoritative; loading
# .local.env first lets it win over .env for the same key.
for _env_file in _ENV_FILES:
    load_dotenv(_env_file, override=False)


class Configuration(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[
            str(_BACKEND_DIR / "config" / ".local.env"),
            str(_BACKEND_DIR / "config" / ".env"),
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
