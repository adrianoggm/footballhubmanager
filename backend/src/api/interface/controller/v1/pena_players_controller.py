import math
from dataclasses import asdict

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth.dependencies import authorize_pena_access
from persistence.application.use_cases import (
    GetPenaPlayersUseCase,
    PenaPlayerFilters,
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
    use_case = GetPenaPlayersUseCase(db)
    result = use_case.execute(pena_guid, filters=filters, page=page, page_size=page_size)

    total_pages = math.ceil(result.total / page_size) if result.total else 0
    return PenaPlayersPageResponse(
        items=[PenaPlayerResponse(**asdict(item)) for item in result.items],
        page=result.page,
        page_size=result.page_size,
        total=result.total,
        total_pages=total_pages,
    )
