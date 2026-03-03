import math
from dataclasses import asdict
from datetime import date

from api.interface.controller.v1.model.request.pena_seasons_request import (
    CreatePenaSeasonRequest,
    UpdatePenaSeasonRequest,
)
from api.interface.controller.v1.model.response.pena_seasons_response import (
    PenaSeasonResponse,
    PenaSeasonsPageResponse,
)
from auth.dependencies import authorize_pena_access, require_admin
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from persistence.application.use_cases.manage_pena_seasons import (
    InvalidPenaSeasonDataError,
    ManagePenaSeasonsUseCase,
    PenaSeasonAccessDeniedError,
    PenaSeasonCreate,
    PenaSeasonDateOverlapError,
    PenaSeasonNotFoundError,
    PenaSeasonPenaNotFoundError,
    PenaSeasonUpdate,
)
from persistence.infrastructure.repository.db.pena_season_repository import (
    SqlAlchemyPenaSeasonRepository,
)
from persistence.module import get_db
from sqlalchemy.orm import Session

router = APIRouter()


def get_manage_pena_seasons_use_case(
    db: Session = Depends(get_db),
) -> ManagePenaSeasonsUseCase:
    repository = SqlAlchemyPenaSeasonRepository(db)
    return ManagePenaSeasonsUseCase(repository)


@router.get("/penas/{pena_guid}/seasons", response_model=PenaSeasonsPageResponse)
def list_pena_seasons(
    pena_guid: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    use_case: ManagePenaSeasonsUseCase = Depends(get_manage_pena_seasons_use_case),
    _session=Depends(authorize_pena_access),
):
    try:
        result = use_case.list_for_pena(pena_guid=pena_guid, page=page, page_size=page_size)
    except PenaSeasonPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")

    total_pages = math.ceil(result.total / result.page_size) if result.total else 0
    return PenaSeasonsPageResponse(
        items=[PenaSeasonResponse(**asdict(item)) for item in result.items],
        page=result.page,
        page_size=result.page_size,
        total=result.total,
        total_pages=total_pages,
    )


@router.get("/penas/{pena_guid}/seasons/active", response_model=PenaSeasonResponse)
def get_active_pena_season(
    pena_guid: str,
    at_date: date | None = Query(default=None),
    use_case: ManagePenaSeasonsUseCase = Depends(get_manage_pena_seasons_use_case),
    _session=Depends(authorize_pena_access),
):
    try:
        season = use_case.get_active_for_pena(pena_guid=pena_guid, reference_date=at_date)
    except PenaSeasonPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaSeasonNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active season not found")
    return PenaSeasonResponse(**asdict(season))


@router.get("/penas/{pena_guid}/seasons/{season_guid}", response_model=PenaSeasonResponse)
def get_pena_season(
    pena_guid: str,
    season_guid: str,
    use_case: ManagePenaSeasonsUseCase = Depends(get_manage_pena_seasons_use_case),
    _session=Depends(authorize_pena_access),
):
    try:
        season = use_case.get_by_guid(pena_guid=pena_guid, season_guid=season_guid)
    except PenaSeasonPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaSeasonNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")
    return PenaSeasonResponse(**asdict(season))


@router.post(
    "/penas/{pena_guid}/seasons",
    response_model=PenaSeasonResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_pena_season(
    pena_guid: str,
    payload: CreatePenaSeasonRequest,
    admin_session=Depends(require_admin),
    use_case: ManagePenaSeasonsUseCase = Depends(get_manage_pena_seasons_use_case),
):
    try:
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
    except InvalidPenaSeasonDataError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid season date range",
        )
    except PenaSeasonPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaSeasonAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin does not manage this pena",
        )
    except PenaSeasonDateOverlapError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Season range overlaps an existing season",
        )
    return PenaSeasonResponse(**asdict(created))


@router.patch("/penas/{pena_guid}/seasons/{season_guid}", response_model=PenaSeasonResponse)
def update_pena_season(
    pena_guid: str,
    season_guid: str,
    payload: UpdatePenaSeasonRequest,
    admin_session=Depends(require_admin),
    use_case: ManagePenaSeasonsUseCase = Depends(get_manage_pena_seasons_use_case),
):
    try:
        updated = use_case.update_for_admin(
            pena_guid=pena_guid,
            season_guid=season_guid,
            admin_id=admin_session.user_id,
            update=PenaSeasonUpdate(
                start_date=payload.start_date,
                end_date=payload.end_date,
                points_win=payload.points_win,
                points_draw=payload.points_draw,
                points_loss=payload.points_loss,
                start_date_provided="start_date" in payload.model_fields_set,
                end_date_provided="end_date" in payload.model_fields_set,
                points_win_provided="points_win" in payload.model_fields_set,
                points_draw_provided="points_draw" in payload.model_fields_set,
                points_loss_provided="points_loss" in payload.model_fields_set,
            ),
        )
    except InvalidPenaSeasonDataError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid season update data",
        )
    except PenaSeasonPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaSeasonNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")
    except PenaSeasonAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin does not manage this pena",
        )
    except PenaSeasonDateOverlapError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Season range overlaps an existing season",
        )
    return PenaSeasonResponse(**asdict(updated))


@router.delete("/penas/{pena_guid}/seasons/{season_guid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pena_season(
    pena_guid: str,
    season_guid: str,
    admin_session=Depends(require_admin),
    use_case: ManagePenaSeasonsUseCase = Depends(get_manage_pena_seasons_use_case),
):
    try:
        use_case.delete_for_admin(
            pena_guid=pena_guid,
            season_guid=season_guid,
            admin_id=admin_session.user_id,
        )
    except PenaSeasonPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaSeasonNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")
    except PenaSeasonAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin does not manage this pena",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
