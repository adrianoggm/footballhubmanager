import math
from dataclasses import asdict
from datetime import date

from api.dependencies.use_cases import get_manage_pena_seasons_use_case
from api.interface.controller.v1.model.request.pena_seasons_request import (
    CreatePenaSeasonRequest,
    UpdatePenaSeasonRequest,
)
from api.interface.controller.v1.model.response.pena_seasons_response import (
    PenaSeasonResponse,
    PenaSeasonsPageResponse,
)
from api.middleware.exception_mapper import map_exceptions
from auth.dependencies import authorize_pena_access, require_admin
from fastapi import APIRouter, Depends, Query, Response, status
from persistence.application.update_policies import FieldUpdate
from persistence.application.use_cases.manage_pena_seasons_usecase import (
    InvalidPenaSeasonDataError,
    ManagePenaSeasonsUseCase,
    PenaSeasonCreate,
    PenaSeasonNotFoundError,
    PenaSeasonUpdate,
)

router = APIRouter()


ACTIVE_PENA_SEASON_OVERRIDES = {
    PenaSeasonNotFoundError: (status.HTTP_404_NOT_FOUND, "Active season not found"),
}


CREATE_PENA_SEASON_OVERRIDES = {
    InvalidPenaSeasonDataError: (status.HTTP_400_BAD_REQUEST, "Invalid season date range"),
}


UPDATE_PENA_SEASON_OVERRIDES = {
    InvalidPenaSeasonDataError: (status.HTTP_400_BAD_REQUEST, "Invalid season update data"),
}


@router.get("/penas/{pena_guid}/seasons", response_model=PenaSeasonsPageResponse)
@map_exceptions
def list_pena_seasons(
    pena_guid: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    use_case: ManagePenaSeasonsUseCase = Depends(get_manage_pena_seasons_use_case),
    _session=Depends(authorize_pena_access),
):
    result = use_case.list_for_pena(pena_guid=pena_guid, page=page, page_size=page_size)

    total_pages = math.ceil(result.total / result.page_size) if result.total else 0
    return PenaSeasonsPageResponse(
        items=[PenaSeasonResponse(**asdict(item)) for item in result.items],
        page=result.page,
        page_size=result.page_size,
        total=result.total,
        total_pages=total_pages,
    )


@router.get("/penas/{pena_guid}/seasons/active", response_model=PenaSeasonResponse)
@map_exceptions(overrides=ACTIVE_PENA_SEASON_OVERRIDES)
def get_active_pena_season(
    pena_guid: str,
    at_date: date | None = Query(default=None),
    use_case: ManagePenaSeasonsUseCase = Depends(get_manage_pena_seasons_use_case),
    _session=Depends(authorize_pena_access),
):
    season = use_case.get_active_for_pena(pena_guid=pena_guid, reference_date=at_date)
    return PenaSeasonResponse(**asdict(season))


@router.get("/penas/{pena_guid}/seasons/{season_guid}", response_model=PenaSeasonResponse)
@map_exceptions
def get_pena_season(
    pena_guid: str,
    season_guid: str,
    use_case: ManagePenaSeasonsUseCase = Depends(get_manage_pena_seasons_use_case),
    _session=Depends(authorize_pena_access),
):
    season = use_case.get_by_guid(pena_guid=pena_guid, season_guid=season_guid)
    return PenaSeasonResponse(**asdict(season))


@router.post(
    "/penas/{pena_guid}/seasons",
    response_model=PenaSeasonResponse,
    status_code=status.HTTP_201_CREATED,
)
@map_exceptions(overrides=CREATE_PENA_SEASON_OVERRIDES)
def create_pena_season(
    pena_guid: str,
    payload: CreatePenaSeasonRequest,
    admin_session=Depends(require_admin),
    use_case: ManagePenaSeasonsUseCase = Depends(get_manage_pena_seasons_use_case),
):
    created = use_case.create_for_admin(
        pena_guid=pena_guid,
        admin_id=admin_session.user_id,
        data=PenaSeasonCreate(
            start_date=payload.start_date,
            end_date=payload.end_date,
            points_win=payload.points_win,
            points_draw=payload.points_draw,
            points_loss=payload.points_loss,
        ),
    )
    return PenaSeasonResponse(**asdict(created))


@router.patch("/penas/{pena_guid}/seasons/{season_guid}", response_model=PenaSeasonResponse)
@map_exceptions(overrides=UPDATE_PENA_SEASON_OVERRIDES)
def update_pena_season(
    pena_guid: str,
    season_guid: str,
    payload: UpdatePenaSeasonRequest,
    admin_session=Depends(require_admin),
    use_case: ManagePenaSeasonsUseCase = Depends(get_manage_pena_seasons_use_case),
):
    updated = use_case.update_for_admin(
        pena_guid=pena_guid,
        season_guid=season_guid,
        admin_id=admin_session.user_id,
        update=PenaSeasonUpdate(
            start_date=(
                FieldUpdate.set(payload.start_date)
                if "start_date" in payload.model_fields_set
                else FieldUpdate.keep()
            ),
            end_date=(
                FieldUpdate.set(payload.end_date)
                if "end_date" in payload.model_fields_set
                else FieldUpdate.keep()
            ),
            points_win=(
                FieldUpdate.set(payload.points_win)
                if "points_win" in payload.model_fields_set
                else FieldUpdate.keep()
            ),
            points_draw=(
                FieldUpdate.set(payload.points_draw)
                if "points_draw" in payload.model_fields_set
                else FieldUpdate.keep()
            ),
            points_loss=(
                FieldUpdate.set(payload.points_loss)
                if "points_loss" in payload.model_fields_set
                else FieldUpdate.keep()
            ),
        ),
    )
    return PenaSeasonResponse(**asdict(updated))


@router.delete("/penas/{pena_guid}/seasons/{season_guid}", status_code=status.HTTP_204_NO_CONTENT)
@map_exceptions
def delete_pena_season(
    pena_guid: str,
    season_guid: str,
    admin_session=Depends(require_admin),
    use_case: ManagePenaSeasonsUseCase = Depends(get_manage_pena_seasons_use_case),
):
    use_case.delete_for_admin(
        pena_guid=pena_guid,
        season_guid=season_guid,
        admin_id=admin_session.user_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
