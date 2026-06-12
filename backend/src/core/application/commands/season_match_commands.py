from dataclasses import dataclass

from core.application.models.season_competition_models import (
    SeasonMatchCreate,
    SeasonMatchCreateDetailed,
    SeasonMatchEventCreate,
    SeasonMatchLineupsUpdate,
    SeasonMatchResultUpdate,
    SeasonMatchStatsUpdate,
    SeasonMatchUpdate,
)


@dataclass(frozen=True)
class CreateSeasonMatchCommand:
    pena_guid: str
    season_guid: str
    admin_id: int
    data: SeasonMatchCreate


@dataclass(frozen=True)
class UpdateSeasonMatchResultCommand:
    pena_guid: str
    season_guid: str
    match_guid: str
    admin_id: int
    update: SeasonMatchResultUpdate


@dataclass(frozen=True)
class CreateSeasonMatchWithLineupsCommand:
    pena_guid: str
    season_guid: str
    admin_id: int
    data: SeasonMatchCreateDetailed


@dataclass(frozen=True)
class UpdateSeasonMatchStatsCommand:
    pena_guid: str
    season_guid: str
    match_guid: str
    admin_id: int
    update: SeasonMatchStatsUpdate


@dataclass(frozen=True)
class UpdateSeasonMatchCommand:
    pena_guid: str
    season_guid: str
    match_guid: str
    admin_id: int
    update: SeasonMatchUpdate


@dataclass(frozen=True)
class StartSeasonMatchCommand:
    pena_guid: str
    season_guid: str
    match_guid: str
    admin_id: int


@dataclass(frozen=True)
class StopSeasonMatchCommand:
    pena_guid: str
    season_guid: str
    match_guid: str
    admin_id: int


@dataclass(frozen=True)
class PauseSeasonMatchCommand:
    pena_guid: str
    season_guid: str
    match_guid: str
    admin_id: int


@dataclass(frozen=True)
class ResumeSeasonMatchCommand:
    pena_guid: str
    season_guid: str
    match_guid: str
    admin_id: int


@dataclass(frozen=True)
class CreateSeasonMatchEventCommand:
    pena_guid: str
    season_guid: str
    match_guid: str
    admin_id: int
    data: SeasonMatchEventCreate


@dataclass(frozen=True)
class DeleteSeasonMatchEventCommand:
    pena_guid: str
    season_guid: str
    match_guid: str
    event_guid: str
    admin_id: int


@dataclass(frozen=True)
class UpdateSeasonMatchLineupsCommand:
    pena_guid: str
    season_guid: str
    match_guid: str
    admin_id: int
    update: SeasonMatchLineupsUpdate


@dataclass(frozen=True)
class DeleteSeasonMatchCommand:
    pena_guid: str
    season_guid: str
    match_guid: str
    admin_id: int
