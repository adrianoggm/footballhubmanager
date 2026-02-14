import math
from dataclasses import asdict
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth.dependencies import authorize_pena_access, require_admin
from persistence.application.use_cases.manage_pena_seasons import (
    InvalidPenaSeasonDataError,
    ManagePenaSeasonsUseCase,
    PenaSeasonAccessDeniedError,
    PenaSeasonCreate,
    PenaSeasonDateOverlapError,
    PenaSeasonPenaNotFoundError,
    PenaSeasonNotFoundError,
    PenaSeasonUpdate,
)
from persistence.infrastructure.repository.db.pena_season_repository import (
    SqlAlchemyPenaSeasonRepository,
)
from persistence.module import get_db

router = APIRouter()


class PenaSeasonResponse(BaseModel):
    guid: str
    start_date: date
    end_date: date


class PenaSeasonsPageResponse(BaseModel):
    items: list[PenaSeasonResponse]
    page: int
    page_size: int
    total: int
    total_pages: int


class CreatePenaSeasonRequest(BaseModel):
    start_date: date
    end_date: date


class UpdatePenaSeasonRequest(BaseModel):
    start_date: date | None = None
    end_date: date | None = None


@router.get("/penas/{pena_guid}/seasons", response_model=PenaSeasonsPageResponse)
def list_pena_seasons(
    pena_guid: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _session=Depends(authorize_pena_access),
):
    repository = SqlAlchemyPenaSeasonRepository(db)
    use_case = ManagePenaSeasonsUseCase(repository)
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
    db: Session = Depends(get_db),
    _session=Depends(authorize_pena_access),
):
    repository = SqlAlchemyPenaSeasonRepository(db)
    use_case = ManagePenaSeasonsUseCase(repository)
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
    db: Session = Depends(get_db),
    _session=Depends(authorize_pena_access),
):
    repository = SqlAlchemyPenaSeasonRepository(db)
    use_case = ManagePenaSeasonsUseCase(repository)
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
    db: Session = Depends(get_db),
):
    repository = SqlAlchemyPenaSeasonRepository(db)
    use_case = ManagePenaSeasonsUseCase(repository)
    try:
        created = use_case.create_for_admin(
            pena_guid=pena_guid,
            admin_id=admin_session.user_id,
            data=PenaSeasonCreate(
                start_date=payload.start_date,
                end_date=payload.end_date,
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
    db: Session = Depends(get_db),
):
    repository = SqlAlchemyPenaSeasonRepository(db)
    use_case = ManagePenaSeasonsUseCase(repository)
    try:
        updated = use_case.update_for_admin(
            pena_guid=pena_guid,
            season_guid=season_guid,
            admin_id=admin_session.user_id,
            update=PenaSeasonUpdate(
                start_date=payload.start_date,
                end_date=payload.end_date,
                start_date_provided="start_date" in payload.model_fields_set,
                end_date_provided="end_date" in payload.model_fields_set,
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
    db: Session = Depends(get_db),
):
    repository = SqlAlchemyPenaSeasonRepository(db)
    use_case = ManagePenaSeasonsUseCase(repository)
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
