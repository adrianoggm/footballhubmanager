from fastapi import APIRouter

from api.interface.controller.v1.auth_controller import router as auth_router
from api.interface.controller.v1.catalogs_controller import router as catalogs_router
from api.interface.controller.v1.penas_controller import router as penas_router
from api.interface.controller.v1.players_controller import router as players_router
from api.interface.controller.v1.pena_players_controller import router as pena_players_router
from api.interface.controller.v1.season_competition_controller import router as season_competition_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/v1", tags=["auth"])
api_router.include_router(catalogs_router, prefix="/v1", tags=["catalogs"])
api_router.include_router(penas_router, prefix="/v1", tags=["penas"])
api_router.include_router(pena_players_router, prefix="/v1", tags=["penas"])
api_router.include_router(season_competition_router, prefix="/v1", tags=["seasons"])
api_router.include_router(players_router, prefix="/v1", tags=["players"])

__all__ = ["api_router"]