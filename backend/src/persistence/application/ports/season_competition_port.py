from dataclasses import dataclass, field
from datetime import date
from typing import Protocol


@dataclass(frozen=True)
class SeasonResult:
    guid: str
    start_date: date
    end_date: date
    points_win: int
    points_draw: int
    points_loss: int


@dataclass(frozen=True)
class SeasonPlayerResult:
    player_guid: str
    name: str
    surname1: str
    surname2: str | None
    nationality: str
    nickname: str | None
    role: str | None = field(default=None, kw_only=True)
    role_color: str | None = field(default=None, kw_only=True)
    position: str | None
    position_color: str | None = field(default=None, kw_only=True)
    played: int
    goals: int
    assists: int
    wins: int
    losses: int
    draws: int
    quality_level: float
    points: int


@dataclass(frozen=True)
class SeasonPlayersPageResult:
    items: list[SeasonPlayerResult]
    page: int
    page_size: int
    total: int


@dataclass(frozen=True)
class SeasonPlayerFilters:
    name: str | None = None
    surname1: str | None = None
    surname2: str | None = None
    nationality: str | None = None
    nickname: str | None = None
    role: str | None = None
    roles: tuple[str, ...] = ()
    position: str | None = None
    positions: tuple[str, ...] = ()
    search: str | None = None


@dataclass(frozen=True)
class MatchResult:
    guid: str
    season_guid: str
    match_date: date
    home_player_guid: str
    away_player_guid: str
    home_player_name: str
    away_player_name: str
    status: str
    home_score: int
    away_score: int


@dataclass(frozen=True)
class MatchPlayerStatsUpdateData:
    player_guid: str
    goals: int
    assists: int
    saves: int
    rating: float


@dataclass(frozen=True)
class MatchEventCreateData:
    event_type: str
    team_side: str
    player_guid: str | None
    related_player_guid: str | None
    note: str | None
    elapsed_seconds: int | None
    value_delta: int = 1


@dataclass(frozen=True)
class MatchPlayerStatsResult:
    player_guid: str
    name: str
    surname1: str
    surname2: str | None
    nickname: str | None
    position: str | None
    goals: int
    assists: int
    saves: int
    rating: float


@dataclass(frozen=True)
class MatchEventResult:
    guid: str
    event_type: str
    team_side: str
    elapsed_seconds: int
    value_delta: int
    player_guid: str | None
    player_name: str | None
    player_surname1: str | None
    player_surname2: str | None
    player_nickname: str | None
    related_player_guid: str | None
    related_player_name: str | None
    related_player_surname1: str | None
    related_player_surname2: str | None
    related_player_nickname: str | None
    note: str | None
    recorded_at_epoch: int


@dataclass(frozen=True)
class MatchTeamResult:
    team_guid: str
    team_name: str
    score: int
    total_assists: int
    total_saves: int
    average_rating: float
    players: list[MatchPlayerStatsResult]


@dataclass(frozen=True)
class MatchDetailResult:
    guid: str
    season_guid: str
    match_date: date
    status: str
    tracking_status: str
    started_at_epoch: int | None
    ended_at_epoch: int | None
    elapsed_seconds: int
    home_team: MatchTeamResult
    away_team: MatchTeamResult
    events: list[MatchEventResult]


@dataclass(frozen=True)
class MatchSummaryResult:
    guid: str
    season_guid: str
    match_date: date
    status: str
    home_team_name: str
    away_team_name: str
    home_score: int
    away_score: int
    home_players: int
    away_players: int
    tracking_status: str
    started_at_epoch: int | None
    ended_at_epoch: int | None
    elapsed_seconds: int


@dataclass(frozen=True)
class MatchesPageResult:
    items: list[MatchSummaryResult]
    page: int
    page_size: int
    total: int


@dataclass(frozen=True)
class MatchInsightRowResult:
    season_guid: str
    match_guid: str
    match_date: date
    home_score: int
    away_score: int
    team_side: str
    player_guid: str
    player_name: str
    player_surname1: str
    player_surname2: str | None
    player_nickname: str | None
    goals: int
    assists: int
    saves: int
    player_position: str | None = None
    rating: float = 0.0


class PenaNotFoundError(Exception):
    pass


class PenaNotManagedByAdminError(Exception):
    pass


class SeasonNotFoundError(Exception):
    pass


class SeasonDateRangeOverlapError(Exception):
    pass


class InvalidSeasonDateRangeError(Exception):
    pass


class PlayerNotFoundError(Exception):
    pass


class PlayerNotInPenaError(Exception):
    pass


class SeasonPlayerAlreadyRegisteredError(Exception):
    pass


class SeasonPlayerNotFoundError(Exception):
    pass


class InvalidSeasonPlayerStatsError(Exception):
    pass


class MatchNotFoundError(Exception):
    pass


class MatchPlayersNotInSeasonError(Exception):
    pass


class SamePlayerMatchError(Exception):
    pass


class InvalidMatchDataError(Exception):
    pass


class MatchStatsMismatchError(Exception):
    pass


class MatchLineupLockedError(Exception):
    pass


class MatchClockAlreadyStartedError(Exception):
    pass


class MatchClockNotRunningError(Exception):
    pass


class MatchEventNotFoundError(Exception):
    pass


class MatchEventPlayerNotInMatchError(Exception):
    pass


class SeasonPlayerHasMatchesError(Exception):
    pass


class SeasonCompetitionPort(Protocol):
    def find_active_for_pena(
        self, *, pena_guid: str, reference_date: date
    ) -> SeasonResult | None: ...

    def create_season_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        start_date: date,
        end_date: date,
        points_win: int,
        points_draw: int,
        points_loss: int,
    ) -> SeasonResult: ...
