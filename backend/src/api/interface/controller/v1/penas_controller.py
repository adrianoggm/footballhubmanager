import math
from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth.dependencies import authorize_pena_access, get_current_session
from persistence.application.use_cases import GetPenasUseCase, PenasPage
from persistence.infrastructure.repository.db.pena_query_repository import (
    SqlAlchemyPenaQueryRepository,
)
from persistence.module import get_db

router = APIRouter()


class PenaResponse(BaseModel):
    guid: str
    name: str


class PenasPageResponse(BaseModel):
    items: list[PenaResponse]
    page: int
    page_size: int
    total: int
    total_pages: int


def _page_response(page: PenasPage) -> PenasPageResponse:
    total_pages = math.ceil(page.total / page.page_size) if page.total else 0
    return PenasPageResponse(
        items=[PenaResponse(**asdict(item)) for item in page.items],
        page=page.page,
        page_size=page.page_size,
        total=page.total,
        total_pages=total_pages,
    )


@router.get("/penas", response_model=PenasPageResponse)
def list_penas(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(default=None),
    session=Depends(get_current_session),
    db: Session = Depends(get_db),
):
    repository = SqlAlchemyPenaQueryRepository(db)
    use_case = GetPenasUseCase(repository)
    if session.user_type == "admin":
        result = use_case.execute_for_admin(
            session.user_id, page=page, page_size=page_size, search=search
        )
        return _page_response(result)
    if session.user_type == "user":
        result = use_case.execute_for_user(
            session.user_id, page=page, page_size=page_size, search=search
        )
        return _page_response(result)
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid session type")


@router.get("/penas/{pena_guid}", response_model=PenaResponse)
def get_pena(
    pena_guid: str,
    _session=Depends(authorize_pena_access),
    db: Session = Depends(get_db),
):
    repository = SqlAlchemyPenaQueryRepository(db)
    use_case = GetPenasUseCase(repository)
    pena = use_case.execute_by_guid(pena_guid)
    if not pena:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    return PenaResponse(**asdict(pena))
