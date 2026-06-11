from dataclasses import asdict

from api.dependencies.use_cases import (
    get_player_profile_command_bus,
    get_player_profile_query_bus,
)
from api.interface.controller.v1.model.request.players_request import PlayerUpdateRequest
from api.interface.controller.v1.model.response.players_response import (
    PlayerProfileResponse,
)
from api.middleware.exception_mapper import map_exceptions
from auth.dependencies import authorize_player_access, require_user
from core.application.commands.player_profile_commands import (
    UpdatePlayerProfileByAccountIdCommand,
)
from core.application.models import PlayerProfile
from core.application.queries.player_profile_queries import (
    GetPlayerProfileByAccountIdQuery,
    GetPlayerProfileByGuidQuery,
)
from fastapi import APIRouter, Depends, HTTPException, status
from shared.application.bus.buses import CommandBus, QueryBus

router = APIRouter()


def _profile_or_404(profile: PlayerProfile | None) -> PlayerProfile:
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    return profile


@router.get("/players/me", response_model=PlayerProfileResponse)
def get_me(
    session=Depends(require_user),
    query_bus: QueryBus = Depends(get_player_profile_query_bus),
):
    profile = _profile_or_404(
        query_bus.ask(GetPlayerProfileByAccountIdQuery(account_id=session.user_id))
    )
    return PlayerProfileResponse(**asdict(profile))


@router.put("/players/me", response_model=PlayerProfileResponse)
@map_exceptions
def update_me(
    payload: PlayerUpdateRequest,
    session=Depends(require_user),
    command_bus: CommandBus = Depends(get_player_profile_command_bus),
):
    profile = _profile_or_404(
        command_bus.dispatch(
            UpdatePlayerProfileByAccountIdCommand(
                account_id=session.user_id,
                name=payload.name,
                surname1=payload.surname1,
                surname2=payload.surname2,
                nationality=payload.nationality,
                image_url=payload.image_url,
            )
        )
    )
    return PlayerProfileResponse(**asdict(profile))


@router.get("/players/{player_guid}", response_model=PlayerProfileResponse)
def get_player(
    player_guid: str,
    _session=Depends(authorize_player_access),
    query_bus: QueryBus = Depends(get_player_profile_query_bus),
):
    profile = _profile_or_404(query_bus.ask(GetPlayerProfileByGuidQuery(player_guid=player_guid)))
    return PlayerProfileResponse(**asdict(profile))
