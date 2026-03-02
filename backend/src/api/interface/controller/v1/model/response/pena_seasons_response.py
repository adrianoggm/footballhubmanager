from datetime import date

from pydantic import BaseModel


class PenaSeasonResponse(BaseModel):
    guid: str
    start_date: date
    end_date: date
    points_win: int
    points_draw: int
    points_loss: int


class PenaSeasonsPageResponse(BaseModel):
    items: list[PenaSeasonResponse]
    page: int
    page_size: int
    total: int
    total_pages: int
