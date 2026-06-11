from dataclasses import dataclass, field

from core.application.models.season_competition_models import SeasonPlayersFilters


@dataclass(frozen=True)
class ListSeasonPlayersQuery:
    pena_guid: str
    season_guid: str
    filters: SeasonPlayersFilters = field(default_factory=SeasonPlayersFilters)
    page: int = 1
    page_size: int = 20
    order_by: str = "quality_level"
    order_dir: str = "desc"


@dataclass(frozen=True)
class GetSeasonStandingsQuery:
    pena_guid: str
    season_guid: str
    filters: SeasonPlayersFilters = field(default_factory=SeasonPlayersFilters)
    page: int = 1
    page_size: int = 20
