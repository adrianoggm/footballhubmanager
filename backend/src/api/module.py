from fastapi import APIRouter

from api.interface.controller.v1.auth_controller import router as auth_router
from api.interface.controller.v1.pena_players_controller import router as pena_players_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/v1", tags=["auth"])
api_router.include_router(pena_players_router, prefix="/v1", tags=["penas"])

__all__ = ["api_router"]
