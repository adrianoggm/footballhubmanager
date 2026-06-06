from dataclasses import dataclass, field
from datetime import date

from core.application.policies import FieldUpdate


@dataclass(frozen=True)
class PenaSeasonInfo:
    guid: str
    start_date: date
    end_date: date
    points_win: int
    points_draw: int
    points_loss: int


@dataclass(frozen=True)
class PenaSeasonsPage:
    items: list[PenaSeasonInfo]
    page: int
    page_size: int
    total: int


@dataclass(frozen=True)
class PenaSeasonCreate:
    start_date: date
    end_date: date
    points_win: int = 3
    points_draw: int = 1
    points_loss: int = 0


@dataclass(frozen=True)
class PenaSeasonUpdate:
    start_date: FieldUpdate[date] = field(default_factory=FieldUpdate.keep)
    end_date: FieldUpdate[date] = field(default_factory=FieldUpdate.keep)
    points_win: FieldUpdate[int] = field(default_factory=FieldUpdate.keep)
    points_draw: FieldUpdate[int] = field(default_factory=FieldUpdate.keep)
    points_loss: FieldUpdate[int] = field(default_factory=FieldUpdate.keep)
