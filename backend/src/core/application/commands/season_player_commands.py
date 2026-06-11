from dataclasses import dataclass, field

from core.application.models.season_competition_models import SeasonPlayerStatsUpdate


@dataclass(frozen=True)
class RegisterSeasonPlayerCommand:
    pena_guid: str
    season_guid: str
    admin_id: int
    player_guid: str


@dataclass(frozen=True)
class RegisterSeasonPlayersBulkCommand:
    pena_guid: str
    season_guid: str
    admin_id: int
    player_guids: list[str]
    source_season_guid: str | None = None


@dataclass(frozen=True)
class UpdateSeasonPlayerStatsCommand:
    pena_guid: str
    season_guid: str
    admin_id: int
    player_guid: str
    update: SeasonPlayerStatsUpdate = field(default_factory=SeasonPlayerStatsUpdate)


@dataclass(frozen=True)
class UnregisterSeasonPlayerCommand:
    pena_guid: str
    season_guid: str
    admin_id: int
    player_guid: str
