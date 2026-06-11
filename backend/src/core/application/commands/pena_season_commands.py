"""Comandos de escritura de temporadas de peña (CQRS)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

from core.application.policies import FieldUpdate


@dataclass(frozen=True)
class CreatePenaSeasonCommand:
    pena_guid: str
    admin_id: int
    start_date: date
    end_date: date
    points_win: int = 3
    points_draw: int = 1
    points_loss: int = 0


@dataclass(frozen=True)
class UpdatePenaSeasonCommand:
    pena_guid: str
    season_guid: str
    admin_id: int
    start_date: FieldUpdate[date] = field(default_factory=FieldUpdate.keep)
    end_date: FieldUpdate[date] = field(default_factory=FieldUpdate.keep)
    points_win: FieldUpdate[int] = field(default_factory=FieldUpdate.keep)
    points_draw: FieldUpdate[int] = field(default_factory=FieldUpdate.keep)
    points_loss: FieldUpdate[int] = field(default_factory=FieldUpdate.keep)


@dataclass(frozen=True)
class DeletePenaSeasonCommand:
    pena_guid: str
    season_guid: str
    admin_id: int
