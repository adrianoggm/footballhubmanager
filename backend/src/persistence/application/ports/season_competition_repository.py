from dataclasses import dataclass
from datetime import date
from typing import Protocol


@dataclass(frozen=True)
class SeasonResult:
    guid: str
    start_date: date
    end_date: date


@dataclass(frozen=True)
class SeasonPlayerResult:
    player_guid: str
    name: str
    surname1: str
    surname2: str | None
    nationality: str
    nickname: str | None
    position: str | None
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
    position: str | None = None
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
    home_score: int
    away_score: int


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


class SeasonCompetitionRepository(Protocol):
    def find_active_for_pena(
        self, *, pena_guid: str, reference_date: date
    ) -> SeasonResult | None:
        ...

    def create_season_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        start_date: date,
        end_date: date,
    ) -> SeasonResult:
        ...

    def register_player_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        player_guid: str,
    ) -> SeasonPlayerResult:
        ...

    def update_player_stats_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        player_guid: str,
        wins_provided: bool,
        wins: int | None,
        losses_provided: bool,
        losses: int | None,
        draws_provided: bool,
        draws: int | None,
        quality_level_provided: bool,
        quality_level: float | None,
    ) -> SeasonPlayerResult:
        ...

    def list_season_players(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        filters: SeasonPlayerFilters,
        page: int,
        page_size: int,
        order_by: str,
        order_dir: str,
    ) -> SeasonPlayersPageResult:
        ...

    def create_match_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        home_player_guid: str,
        away_player_guid: str,
        match_date: date,
    ) -> MatchResult:
        ...

    def update_match_result_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
        home_score: int,
        away_score: int,
        update_standings: bool,
    ) -> MatchResult:
        ...

    def get_standings(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        page: int,
        page_size: int,
    ) -> SeasonPlayersPageResult:
        ...
