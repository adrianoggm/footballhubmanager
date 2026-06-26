from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date


@dataclass(frozen=True)
class GetSeasonMatchInsightsQuery:
    pena_guid: str
    season_guids: list[str] = field(default_factory=list)
    scope: str | None = None
    matrix_size: int = 8
    top_pairs_size: int = 10
    top_trios_size: int = 10
    leaders_size: int = 5
    date_from: date | None = None
    date_to: date | None = None
