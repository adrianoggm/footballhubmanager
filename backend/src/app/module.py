# App module for organizing components
# In FastAPI, this is more of a placeholder for imports

from persistence.module import (
    Base,
    BaseRepository,
    SessionLocal,
    engine,
    get_db,
)
from persistence.module import (
    config as db_config,
)

# Placeholder for API modules
# from api.api_module import api_router

__all__ = ["db_config", "engine", "SessionLocal", "get_db", "Base", "BaseRepository"]
