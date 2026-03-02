from datetime import date

from pydantic import BaseModel


class CreatePenaSeasonRequest(BaseModel):
    start_date: date
    end_date: date
    points_win: int = 3
    points_draw: int = 1
    points_loss: int = 0


class UpdatePenaSeasonRequest(BaseModel):
    start_date: date | None = None
    end_date: date | None = None
    points_win: int | None = None
    points_draw: int | None = None
    points_loss: int | None = None
