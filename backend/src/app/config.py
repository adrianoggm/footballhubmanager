import logging

from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuration(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=['config/.local.env', 'config/.env'],
        case_sensitive=False,
        extra='ignore',
    )


def initialize_config() -> Configuration:
    try:
        return Configuration()
    except ValidationError as e:
        logger = logging.getLogger(__name__)
        logger.error('Config validation error')
        logger.error(str(e))
        raise SystemExit(1)


# Initialize config
config = initialize_config()
