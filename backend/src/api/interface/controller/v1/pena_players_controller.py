import math
from dataclasses import asdict

from api.interface.controller.v1.model.request.pena_players_request import (
    CreateGuestPlayerRequest,
    UpdatePenaMembershipRequest,
)
from api.interface.controller.v1.model.response.pena_players_response import (
    PenaMembershipResponse,
    PenaPlayerResponse,
    PenaPlayersPageResponse,
)
from auth.dependencies import authorize_pena_access, get_current_session, require_admin
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from persistence.application.use_cases import (
    GetPenaPlayersUseCase,
    InvalidPenaGuestPlayerDataError,
    InvalidPenaMembershipUpdateDataError,
    ManagePenaMembershipUseCase,
    PenaGuestPlayerCreate,
    PenaMembershipAccessDeniedError,
    PenaMembershipInvalidNationalityError,
    PenaMembershipNotFoundError,
    PenaMembershipPenaNotFoundError,
    PenaMembershipPlayerNotFoundError,
    PenaMembershipUpdate,
    PenaMembershipUserProfileNotFoundError,
    PenaPlayerFilters,
)
from persistence.infrastructure.repository.db.pena_membership_repository import (
    SqlAlchemyPenaMembershipRepository,
)
from persistence.infrastructure.repository.db.pena_player_query_repository import (
    SqlAlchemyPenaPlayerQueryRepository,
)
from persistence.module import get_db
from sqlalchemy.orm import Session

router = APIRouter()


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


def _to_membership_response(data) -> PenaMembershipResponse:
    return PenaMembershipResponse(**asdict(data))


def get_pena_membership_use_case(
    db: Session = Depends(get_db),
) -> ManagePenaMembershipUseCase:
    repository = SqlAlchemyPenaMembershipRepository(db)
    return ManagePenaMembershipUseCase(repository)


def get_pena_players_use_case(db: Session = Depends(get_db)) -> GetPenaPlayersUseCase:
    repository = SqlAlchemyPenaPlayerQueryRepository(db)
    return GetPenaPlayersUseCase(repository)


@router.post(
    "/penas/{pena_guid}/players",
    response_model=PenaMembershipResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_guest_player_for_admin(
    pena_guid: str,
    payload: CreateGuestPlayerRequest,
    admin_session=Depends(require_admin),
    use_case: ManagePenaMembershipUseCase = Depends(get_pena_membership_use_case),
):
    try:
        created = use_case.create_guest_for_admin(
            pena_guid=pena_guid,
            admin_id=admin_session.user_id,
            data=PenaGuestPlayerCreate(
                name=payload.name,
                surname1=payload.surname1,
                surname2=payload.surname2,
                nationality=payload.nationality,
                nickname=payload.nickname,
                role=payload.role,
                position=payload.position,
            ),
        )
    except InvalidPenaGuestPlayerDataError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid guest player data",
        )
    except PenaMembershipPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaMembershipAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin does not manage this pena",
        )
    except PenaMembershipInvalidNationalityError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid nationality")
    return _to_membership_response(created)


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
    role: str | None = Query(default=None),
    position: str | None = Query(default=None),
    search: str | None = Query(default=None),
    use_case: GetPenaPlayersUseCase = Depends(get_pena_players_use_case),
    _session=Depends(authorize_pena_access),
):
    filters = PenaPlayerFilters(
        name=_clean(name),
        surname1=_clean(surname1),
        surname2=_clean(surname2),
        nationality=_clean(nationality),
        nickname=_clean(nickname),
        role=_clean(role),
        position=_clean(position),
        search=_clean(search),
    )
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
    use_case: ManagePenaMembershipUseCase = Depends(get_pena_membership_use_case),
    _session=Depends(authorize_pena_access),
):
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
    use_case: ManagePenaMembershipUseCase = Depends(get_pena_membership_use_case),
):
    if session.user_type != "user":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User access only")
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
    use_case: ManagePenaMembershipUseCase = Depends(get_pena_membership_use_case),
):
    if session.user_type != "user":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User access only")

    update = PenaMembershipUpdate(
        nickname=payload.nickname,
        nickname_provided="nickname" in payload.model_fields_set,
        role_provided=False,
        position=payload.position,
        position_provided="position" in payload.model_fields_set,
    )
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
    use_case: ManagePenaMembershipUseCase = Depends(get_pena_membership_use_case),
):
    if session.user_type != "user":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User access only")

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
    use_case: ManagePenaMembershipUseCase = Depends(get_pena_membership_use_case),
):
    update = PenaMembershipUpdate(
        nickname=payload.nickname,
        role=payload.role,
        position=payload.position,
        nickname_provided="nickname" in payload.model_fields_set,
        role_provided="role" in payload.model_fields_set,
        position_provided="position" in payload.model_fields_set,
    )
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
    use_case: ManagePenaMembershipUseCase = Depends(get_pena_membership_use_case),
):
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
