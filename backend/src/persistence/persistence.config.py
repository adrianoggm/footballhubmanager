import os
import logging
from typing import Optional


class Configuration:
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)

        # MySQL Configuration
        self.DB_HOST: str = os.getenv('DB_HOST', 'localhost')
        self.DB_PORT: int = int(os.getenv('DB_PORT', '3306'))
        self.DB_NAME: str = os.getenv('DB_NAME', 'footballhub')
        self.DB_USER: str = os.getenv('DB_USER', 'footballuser')
        self.DB_PASSWORD: str = os.getenv('DB_PASSWORD', 'footballpass')
        self.DB_PROVIDER: str = 'mysql'


def initialize_config() -> Configuration:
    return Configuration()
