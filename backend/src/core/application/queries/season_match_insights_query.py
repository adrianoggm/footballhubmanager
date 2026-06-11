from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class GetSeasonMatchInsightsQuery:
    pena_guid: str
    season_guids: list[str] = field(default_factory=list)
    scope: str | None = None
    matrix_size: int = 8
    top_pairs_size: int = 10
    leaders_size: int = 5
