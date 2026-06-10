from __future__ import annotations

from dataclasses import dataclass

from core.application.models import PenaPlayerFilters


@dataclass(frozen=True)
class GetPenaPlayersQuery:
    pena_guid: str
    filters: PenaPlayerFilters | None = None
    page: int = 1
    page_size: int = 20
