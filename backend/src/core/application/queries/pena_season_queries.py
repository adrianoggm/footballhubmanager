"""Queries de lectura de temporadas de peña (CQRS)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class ListPenaSeasonsQuery:
    pena_guid: str
    page: int = 1
    page_size: int = 20


@dataclass(frozen=True)
class GetPenaSeasonQuery:
    pena_guid: str
    season_guid: str


@dataclass(frozen=True)
class GetActivePenaSeasonQuery:
    pena_guid: str
    reference_date: date | None = None
