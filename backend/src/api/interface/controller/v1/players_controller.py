from dataclasses import asdict

from auth.dependencies import authorize_player_access, get_current_session
from fastapi import APIRouter, Depends, HTTPException, status
from persistence.application.use_cases import (
    GetPlayerProfileUseCase,
    InvalidPlayerUpdateDataError,
    PlayerInvalidNationalityError,
    PlayerProfile,
    PlayerUpdate,
    UpdatePlayerProfileUseCase,
)
from persistence.infrastructure.repository.db.player_profile_repository import (
    SqlAlchemyPlayerProfileRepository,
)
from persistence.module import get_db
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

router = APIRouter()


class PenaInfoResponse(BaseModel):
    guid: str
    name: str


class PlayerProfileResponse(BaseModel):
    guid: str
    name: str
    surname1: str
    surname2: str | None
    nationality: str
    penas: list[PenaInfoResponse]


class PlayerUpdateRequest(BaseModel):
    name: str | None = Field(default=None)
    surname1: str | None = Field(default=None)
    surname2: str | None = Field(default=None)
    nationality: str | None = Field(default=None)


def _profile_or_404(profile: PlayerProfile | None) -> PlayerProfile:
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    return profile


@router.get("/players/me", response_model=PlayerProfileResponse)
def get_me(
    session=Depends(get_current_session),
    db: Session = Depends(get_db),
):
    if session.user_type != "user":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User access only")
    repository = SqlAlchemyPlayerProfileRepository(db)
    use_case = GetPlayerProfileUseCase(repository)
    profile = _profile_or_404(use_case.execute_by_account_id(session.user_id))
    return PlayerProfileResponse(**asdict(profile))


@router.put("/players/me", response_model=PlayerProfileResponse)
def update_me(
    payload: PlayerUpdateRequest,
    session=Depends(get_current_session),
    db: Session = Depends(get_db),
):
    if session.user_type != "user":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User access only")
    repository = SqlAlchemyPlayerProfileRepository(db)
    use_case = UpdatePlayerProfileUseCase(repository)
    update = PlayerUpdate(
        name=payload.name,
        surname1=payload.surname1,
        surname2=payload.surname2,
        nationality=payload.nationality,
    )
    try:
        profile = _profile_or_404(use_case.execute_by_account_id(session.user_id, update))
    except PlayerInvalidNationalityError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid nationality")
    except InvalidPlayerUpdateDataError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid player update data"
        )
    return PlayerProfileResponse(**asdict(profile))


@router.get("/players/{player_guid}", response_model=PlayerProfileResponse)
def get_player(
    player_guid: str,
    _session=Depends(authorize_player_access),
    db: Session = Depends(get_db),
):
    repository = SqlAlchemyPlayerProfileRepository(db)
    use_case = GetPlayerProfileUseCase(repository)
    profile = _profile_or_404(use_case.execute_by_guid(player_guid))
    return PlayerProfileResponse(**asdict(profile))
