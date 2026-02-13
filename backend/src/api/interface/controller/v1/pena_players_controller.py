import math
from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth.dependencies import authorize_pena_access, get_current_session, require_admin
from persistence.application.use_cases import (
    GetPenaPlayersUseCase,
    InvalidPenaMembershipUpdateDataError,
    ManagePenaMembershipUseCase,
    PenaPlayerFilters,
    PenaMembershipAccessDeniedError,
    PenaMembershipNotFoundError,
    PenaMembershipPenaNotFoundError,
    PenaMembershipPlayerNotFoundError,
    PenaMembershipUpdate,
    PenaMembershipUserProfileNotFoundError,
)
from persistence.infrastructure.repository.db.pena_membership_repository import (
    SqlAlchemyPenaMembershipRepository,
)
from persistence.infrastructure.repository.db.pena_player_query_repository import (
    SqlAlchemyPenaPlayerQueryRepository,
)
from persistence.module import get_db

router = APIRouter()


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


class PenaPlayerResponse(BaseModel):
    guid: str
    name: str
    surname1: str
    surname2: str | None
    nationality: str
    nickname: str | None
    position: str | None


class PenaPlayersPageResponse(BaseModel):
    items: list[PenaPlayerResponse]
    page: int
    page_size: int
    total: int
    total_pages: int


class UpdatePenaMembershipRequest(BaseModel):
    nickname: str | None = None
    position: str | None = None


class PenaMembershipResponse(BaseModel):
    pena_guid: str
    player_guid: str
    name: str
    surname1: str
    surname2: str | None
    nationality: str
    nickname: str | None
    position: str | None
    role: str


def _to_membership_response(data) -> PenaMembershipResponse:
    return PenaMembershipResponse(**asdict(data))


@router.get("/penas/{pena_guid}/players", response_model=PenaPlayersPageResponse)
def get_pena_players(
    pena_guid: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    name: str | None = Query(default=None),
    surname1: str | None = Query(default=None),
    surname2: str | None = Query(default=None),
    nationality: str | None = Query(default=None),
    nickname: str | None = Query(default=None),
    position: str | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _session=Depends(authorize_pena_access),
):
    filters = PenaPlayerFilters(
        name=_clean(name),
        surname1=_clean(surname1),
        surname2=_clean(surname2),
        nationality=_clean(nationality),
        nickname=_clean(nickname),
        position=_clean(position),
        search=_clean(search),
    )
    repository = SqlAlchemyPenaPlayerQueryRepository(db)
    use_case = GetPenaPlayersUseCase(repository)
    result = use_case.execute(pena_guid, filters=filters, page=page, page_size=page_size)

    total_pages = math.ceil(result.total / page_size) if result.total else 0
    return PenaPlayersPageResponse(
        items=[PenaPlayerResponse(**asdict(item)) for item in result.items],
        page=result.page,
        page_size=result.page_size,
        total=result.total,
        total_pages=total_pages,
    )


@router.get("/penas/{pena_guid}/players/{player_guid}", response_model=PenaMembershipResponse)
def get_pena_player_membership(
    pena_guid: str,
    player_guid: str,
    db: Session = Depends(get_db),
    _session=Depends(authorize_pena_access),
):
    repository = SqlAlchemyPenaMembershipRepository(db)
    use_case = ManagePenaMembershipUseCase(repository)
    try:
        membership = use_case.get_for_player(pena_guid=pena_guid, player_guid=player_guid)
    except PenaMembershipPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaMembershipPlayerNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    except PenaMembershipNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player is not linked to this pena",
        )
    return _to_membership_response(membership)


@router.get("/players/me/penas/{pena_guid}", response_model=PenaMembershipResponse)
def get_my_pena_membership(
    pena_guid: str,
    session=Depends(get_current_session),
    db: Session = Depends(get_db),
):
    if session.user_type != "user":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User access only")

    repository = SqlAlchemyPenaMembershipRepository(db)
    use_case = ManagePenaMembershipUseCase(repository)
    try:
        membership = use_case.get_for_user(pena_guid=pena_guid, account_id=session.user_id)
    except PenaMembershipPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaMembershipUserProfileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User player profile not found",
        )
    except PenaMembershipAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not belong to this pena",
        )
    return _to_membership_response(membership)


@router.patch("/penas/{pena_guid}/players/me", response_model=PenaMembershipResponse)
def update_my_pena_membership(
    pena_guid: str,
    payload: UpdatePenaMembershipRequest,
    session=Depends(get_current_session),
    db: Session = Depends(get_db),
):
    if session.user_type != "user":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User access only")

    update = PenaMembershipUpdate(
        nickname=payload.nickname,
        position=payload.position,
        nickname_provided="nickname" in payload.model_fields_set,
        position_provided="position" in payload.model_fields_set,
    )
    repository = SqlAlchemyPenaMembershipRepository(db)
    use_case = ManagePenaMembershipUseCase(repository)
    try:
        membership = use_case.update_for_user(
            pena_guid=pena_guid,
            account_id=session.user_id,
            update=update,
        )
    except InvalidPenaMembershipUpdateDataError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid membership update data",
        )
    except PenaMembershipPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaMembershipUserProfileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User player profile not found",
        )
    except PenaMembershipAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not belong to this pena",
        )
    return _to_membership_response(membership)


@router.delete("/penas/{pena_guid}/players/me", status_code=status.HTTP_204_NO_CONTENT)
def remove_my_pena_membership(
    pena_guid: str,
    session=Depends(get_current_session),
    db: Session = Depends(get_db),
):
    if session.user_type != "user":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User access only")

    repository = SqlAlchemyPenaMembershipRepository(db)
    use_case = ManagePenaMembershipUseCase(repository)
    try:
        use_case.remove_for_user(pena_guid=pena_guid, account_id=session.user_id)
    except PenaMembershipPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaMembershipUserProfileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User player profile not found",
        )
    except PenaMembershipAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not belong to this pena",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/penas/{pena_guid}/players/{player_guid}", response_model=PenaMembershipResponse)
def update_pena_player_membership_as_admin(
    pena_guid: str,
    player_guid: str,
    payload: UpdatePenaMembershipRequest,
    admin_session=Depends(require_admin),
    db: Session = Depends(get_db),
):
    update = PenaMembershipUpdate(
        nickname=payload.nickname,
        position=payload.position,
        nickname_provided="nickname" in payload.model_fields_set,
        position_provided="position" in payload.model_fields_set,
    )
    repository = SqlAlchemyPenaMembershipRepository(db)
    use_case = ManagePenaMembershipUseCase(repository)
    try:
        membership = use_case.update_for_admin(
            pena_guid=pena_guid,
            admin_id=admin_session.user_id,
            player_guid=player_guid,
            update=update,
        )
    except InvalidPenaMembershipUpdateDataError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid membership update data",
        )
    except PenaMembershipPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaMembershipAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin does not manage this pena",
        )
    except PenaMembershipPlayerNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    except PenaMembershipNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Player is not linked to this pena",
        )
    return _to_membership_response(membership)


@router.delete("/penas/{pena_guid}/players/{player_guid}", status_code=status.HTTP_204_NO_CONTENT)
def remove_pena_player_membership_as_admin(
    pena_guid: str,
    player_guid: str,
    admin_session=Depends(require_admin),
    db: Session = Depends(get_db),
):
    repository = SqlAlchemyPenaMembershipRepository(db)
    use_case = ManagePenaMembershipUseCase(repository)
    try:
        use_case.remove_for_admin(
            pena_guid=pena_guid,
            admin_id=admin_session.user_id,
            player_guid=player_guid,
        )
    except PenaMembershipPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaMembershipAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin does not manage this pena",
        )
    except PenaMembershipPlayerNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    except PenaMembershipNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Player is not linked to this pena",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
