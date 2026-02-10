import logging
import os


class Configuration:
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.APP_ENV: str = os.getenv('APP_ENV', 'development')
        self.SQL_ECHO: str | None = os.getenv('SQL_ECHO')

        # MySQL Configuration
        self.DB_HOST: str = os.getenv('DB_HOST', 'localhost')
        self.DB_PORT: int = int(os.getenv('DB_PORT', '3306'))
        self.DB_NAME: str = os.getenv('DB_NAME', 'footballhub')
        self.DB_USER: str = os.getenv('DB_USER', 'footballuser')
        self.DB_PASSWORD: str = os.getenv('DB_PASSWORD', 'footballpass')
        self.DB_PROVIDER: str = os.getenv('DB_PROVIDER', 'mysql+pymysql')


def initialize_config() -> Configuration:
    return Configuration()
