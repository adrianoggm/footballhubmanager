import math
from dataclasses import asdict

from api.dependencies.use_cases import (
    get_pena_membership_use_case,
    get_pena_players_use_case,
)
from api.interface.controller.v1.model.request.pena_players_request import (
    CreateGuestPlayerRequest,
    UpdatePenaMembershipRequest,
)
from api.interface.controller.v1.model.response.pena_players_response import (
    PenaMembershipResponse,
    PenaPlayerResponse,
    PenaPlayersPageResponse,
)
from api.middleware.exception_mapper import map_exceptions
from auth.dependencies import authorize_pena_access, require_admin, require_user
from fastapi import APIRouter, Depends, Query, Response, status
from persistence.application.update_policies import FieldUpdate
from persistence.application.use_cases import (
    GetPenaPlayersUseCase,
    ManagePenaMembershipUseCase,
    PenaGuestPlayerCreate,
    PenaMembershipAccessDeniedError,
    PenaMembershipNotFoundError,
    PenaMembershipUpdate,
    PenaPlayerFilters,
)

router = APIRouter()


def _clean(value: str | None) -> str | None:
    if value is None or not isinstance(value, str):
        return None
    value = value.strip()
    return value or None


def _to_membership_response(data) -> PenaMembershipResponse:
    return PenaMembershipResponse(**asdict(data))


ADMIN_PENA_MEMBERSHIP_OVERRIDES = {
    PenaMembershipAccessDeniedError: (
        status.HTTP_403_FORBIDDEN,
        "Admin does not manage this pena",
    ),
    PenaMembershipNotFoundError: (
        status.HTTP_409_CONFLICT,
        "Player is not linked to this pena",
    ),
}


USER_PENA_MEMBERSHIP_OVERRIDES = {
    PenaMembershipAccessDeniedError: (
        status.HTTP_403_FORBIDDEN,
        "User does not belong to this pena",
    ),
}


@router.post(
    "/penas/{pena_guid}/players",
    response_model=PenaMembershipResponse,
    status_code=status.HTTP_201_CREATED,
)
@map_exceptions(overrides=ADMIN_PENA_MEMBERSHIP_OVERRIDES)
def create_guest_player_for_admin(
    pena_guid: str,
    payload: CreateGuestPlayerRequest,
    admin_session=Depends(require_admin),
    use_case: ManagePenaMembershipUseCase = Depends(get_pena_membership_use_case),
):
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
@map_exceptions
def get_pena_player_membership(
    pena_guid: str,
    player_guid: str,
    use_case: ManagePenaMembershipUseCase = Depends(get_pena_membership_use_case),
    _session=Depends(authorize_pena_access),
):
    membership = use_case.get_for_player(pena_guid=pena_guid, player_guid=player_guid)
    return _to_membership_response(membership)


@router.get("/players/me/penas/{pena_guid}", response_model=PenaMembershipResponse)
@map_exceptions(overrides=USER_PENA_MEMBERSHIP_OVERRIDES)
def get_my_pena_membership(
    pena_guid: str,
    session=Depends(require_user),
    use_case: ManagePenaMembershipUseCase = Depends(get_pena_membership_use_case),
):
    membership = use_case.get_for_user(pena_guid=pena_guid, account_id=session.user_id)
    return _to_membership_response(membership)


@router.patch("/penas/{pena_guid}/players/me", response_model=PenaMembershipResponse)
@map_exceptions(overrides=USER_PENA_MEMBERSHIP_OVERRIDES)
def update_my_pena_membership(
    pena_guid: str,
    payload: UpdatePenaMembershipRequest,
    session=Depends(require_user),
    use_case: ManagePenaMembershipUseCase = Depends(get_pena_membership_use_case),
):
    update = PenaMembershipUpdate(
        nickname=(
            FieldUpdate.set(payload.nickname)
            if "nickname" in payload.model_fields_set
            else FieldUpdate.keep()
        ),
        position=(
            FieldUpdate.set(payload.position)
            if "position" in payload.model_fields_set
            else FieldUpdate.keep()
        ),
    )
    membership = use_case.update_for_user(
        pena_guid=pena_guid,
        account_id=session.user_id,
        update=update,
    )
    return _to_membership_response(membership)


@router.delete("/penas/{pena_guid}/players/me", status_code=status.HTTP_204_NO_CONTENT)
@map_exceptions(overrides=USER_PENA_MEMBERSHIP_OVERRIDES)
def remove_my_pena_membership(
    pena_guid: str,
    session=Depends(require_user),
    use_case: ManagePenaMembershipUseCase = Depends(get_pena_membership_use_case),
):
    use_case.remove_for_user(pena_guid=pena_guid, account_id=session.user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/penas/{pena_guid}/players/{player_guid}", response_model=PenaMembershipResponse)
@map_exceptions(overrides=ADMIN_PENA_MEMBERSHIP_OVERRIDES)
def update_pena_player_membership_as_admin(
    pena_guid: str,
    player_guid: str,
    payload: UpdatePenaMembershipRequest,
    admin_session=Depends(require_admin),
    use_case: ManagePenaMembershipUseCase = Depends(get_pena_membership_use_case),
):
    update = PenaMembershipUpdate(
        nickname=(
            FieldUpdate.set(payload.nickname)
            if "nickname" in payload.model_fields_set
            else FieldUpdate.keep()
        ),
        role=(
            FieldUpdate.set(payload.role)
            if "role" in payload.model_fields_set
            else FieldUpdate.keep()
        ),
        position=(
            FieldUpdate.set(payload.position)
            if "position" in payload.model_fields_set
            else FieldUpdate.keep()
        ),
    )
    membership = use_case.update_for_admin(
        pena_guid=pena_guid,
        admin_id=admin_session.user_id,
        player_guid=player_guid,
        update=update,
    )
    return _to_membership_response(membership)


@router.delete("/penas/{pena_guid}/players/{player_guid}", status_code=status.HTTP_204_NO_CONTENT)
@map_exceptions(overrides=ADMIN_PENA_MEMBERSHIP_OVERRIDES)
def remove_pena_player_membership_as_admin(
    pena_guid: str,
    player_guid: str,
    admin_session=Depends(require_admin),
    use_case: ManagePenaMembershipUseCase = Depends(get_pena_membership_use_case),
):
    use_case.remove_for_admin(
        pena_guid=pena_guid,
        admin_id=admin_session.user_id,
        player_guid=player_guid,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
