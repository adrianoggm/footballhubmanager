import math
from dataclasses import asdict
from datetime import date

from api.dependencies.use_cases import (
    get_pena_season_command_bus,
    get_pena_season_query_bus,
)
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
from core.application.commands.pena_season_commands import (
    CreatePenaSeasonCommand,
    DeletePenaSeasonCommand,
    UpdatePenaSeasonCommand,
)
from core.application.policies import FieldUpdate
from core.application.queries.pena_season_queries import (
    GetActivePenaSeasonQuery,
    GetPenaSeasonQuery,
    ListPenaSeasonsQuery,
)
from core.domain.errors import InvalidPenaSeasonDataError, PenaSeasonNotFoundError
from fastapi import APIRouter, Depends, Query, Response, status
from shared.application.bus.buses import CommandBus, QueryBus

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


def _field_update(payload, name: str) -> FieldUpdate:
    if name in payload.model_fields_set:
        return FieldUpdate.set(getattr(payload, name))
    return FieldUpdate.keep()


@router.get("/penas/{pena_guid}/seasons", response_model=PenaSeasonsPageResponse)
@map_exceptions
def list_pena_seasons(
    pena_guid: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    query_bus: QueryBus = Depends(get_pena_season_query_bus),
    _session=Depends(authorize_pena_access),
):
    result = query_bus.ask(
        ListPenaSeasonsQuery(pena_guid=pena_guid, page=page, page_size=page_size)
    )

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
    query_bus: QueryBus = Depends(get_pena_season_query_bus),
    _session=Depends(authorize_pena_access),
):
    season = query_bus.ask(GetActivePenaSeasonQuery(pena_guid=pena_guid, reference_date=at_date))
    return PenaSeasonResponse(**asdict(season))


@router.get("/penas/{pena_guid}/seasons/{season_guid}", response_model=PenaSeasonResponse)
@map_exceptions
def get_pena_season(
    pena_guid: str,
    season_guid: str,
    query_bus: QueryBus = Depends(get_pena_season_query_bus),
    _session=Depends(authorize_pena_access),
):
    season = query_bus.ask(GetPenaSeasonQuery(pena_guid=pena_guid, season_guid=season_guid))
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
    command_bus: CommandBus = Depends(get_pena_season_command_bus),
):
    created = command_bus.dispatch(
        CreatePenaSeasonCommand(
            pena_guid=pena_guid,
            admin_id=admin_session.user_id,
            start_date=payload.start_date,
            end_date=payload.end_date,
            points_win=payload.points_win,
            points_draw=payload.points_draw,
            points_loss=payload.points_loss,
        )
    )
    return PenaSeasonResponse(**asdict(created))


@router.patch("/penas/{pena_guid}/seasons/{season_guid}", response_model=PenaSeasonResponse)
@map_exceptions(overrides=UPDATE_PENA_SEASON_OVERRIDES)
def update_pena_season(
    pena_guid: str,
    season_guid: str,
    payload: UpdatePenaSeasonRequest,
    admin_session=Depends(require_admin),
    command_bus: CommandBus = Depends(get_pena_season_command_bus),
):
    updated = command_bus.dispatch(
        UpdatePenaSeasonCommand(
            pena_guid=pena_guid,
            season_guid=season_guid,
            admin_id=admin_session.user_id,
            start_date=_field_update(payload, "start_date"),
            end_date=_field_update(payload, "end_date"),
            points_win=_field_update(payload, "points_win"),
            points_draw=_field_update(payload, "points_draw"),
            points_loss=_field_update(payload, "points_loss"),
        )
    )
    return PenaSeasonResponse(**asdict(updated))


@router.delete("/penas/{pena_guid}/seasons/{season_guid}", status_code=status.HTTP_204_NO_CONTENT)
@map_exceptions
def delete_pena_season(
    pena_guid: str,
    season_guid: str,
    admin_session=Depends(require_admin),
    command_bus: CommandBus = Depends(get_pena_season_command_bus),
):
    command_bus.dispatch(
        DeletePenaSeasonCommand(
            pena_guid=pena_guid,
            season_guid=season_guid,
            admin_id=admin_session.user_id,
        )
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
