from dataclasses import asdict

from api.dependencies.use_cases import (
    get_player_profile_use_case,
    get_update_player_profile_use_case,
)
from api.interface.controller.v1.model.request.players_request import PlayerUpdateRequest
from api.interface.controller.v1.model.response.players_response import (
    PlayerProfileResponse,
)
from api.middleware.exception_mapper import map_exceptions
from auth.dependencies import authorize_player_access, require_user
from core.application.models import PlayerProfile
from core.application.use_cases.get_player_profile_usecase import GetPlayerProfileUseCase
from core.application.use_cases.update_player_profile_usecase import (
    PlayerUpdate,
    UpdatePlayerProfileUseCase,
)
from fastapi import APIRouter, Depends, HTTPException, status

router = APIRouter()


def _profile_or_404(profile: PlayerProfile | None) -> PlayerProfile:
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    return profile


@router.get("/players/me", response_model=PlayerProfileResponse)
def get_me(
    session=Depends(require_user),
    use_case: GetPlayerProfileUseCase = Depends(get_player_profile_use_case),
):
    profile = _profile_or_404(use_case.execute_by_account_id(session.user_id))
    return PlayerProfileResponse(**asdict(profile))


@router.put("/players/me", response_model=PlayerProfileResponse)
@map_exceptions
def update_me(
    payload: PlayerUpdateRequest,
    session=Depends(require_user),
    use_case: UpdatePlayerProfileUseCase = Depends(get_update_player_profile_use_case),
):
    update = PlayerUpdate(
        name=payload.name,
        surname1=payload.surname1,
        surname2=payload.surname2,
        nationality=payload.nationality,
        image_url=payload.image_url,
    )
    profile = _profile_or_404(use_case.execute_by_account_id(session.user_id, update))
    return PlayerProfileResponse(**asdict(profile))


@router.get("/players/{player_guid}", response_model=PlayerProfileResponse)
def get_player(
    player_guid: str,
    _session=Depends(authorize_player_access),
    use_case: GetPlayerProfileUseCase = Depends(get_player_profile_use_case),
):
    profile = _profile_or_404(use_case.execute_by_guid(player_guid))
    return PlayerProfileResponse(**asdict(profile))
