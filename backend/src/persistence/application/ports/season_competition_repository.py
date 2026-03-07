from dataclasses import dataclass
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
    role: str | None
    role_color: str | None
    position: str | None
    position_color: str | None
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
    home_team: MatchTeamResult
    away_team: MatchTeamResult


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


class SeasonPlayerHasMatchesError(Exception):
    pass


class SeasonCompetitionRepository(Protocol):
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

    def register_player_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        player_guid: str,
    ) -> SeasonPlayerResult: ...

    def register_players_for_admin_bulk(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        player_guids: list[str],
        source_season_guid: str | None = None,
    ) -> list[SeasonPlayerResult]: ...

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
        role_provided: bool,
        role: str | None,
        position_provided: bool,
        position: str | None,
    ) -> SeasonPlayerResult: ...

    def unregister_player_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        player_guid: str,
    ) -> None: ...

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
    ) -> SeasonPlayersPageResult: ...

    def create_match_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        home_player_guid: str,
        away_player_guid: str,
        match_date: date,
    ) -> MatchResult: ...

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
    ) -> MatchResult: ...

    def create_match_with_lineups_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        match_date: date,
        home_team_name: str | None,
        away_team_name: str | None,
        home_player_guids: list[str],
        away_player_guids: list[str],
    ) -> MatchDetailResult: ...

    def update_match_stats_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
        home_players_stats: list[MatchPlayerStatsUpdateData],
        away_players_stats: list[MatchPlayerStatsUpdateData],
    ) -> MatchDetailResult: ...

    def update_match_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
        match_date_provided: bool,
        match_date: date | None,
        home_team_name_provided: bool,
        home_team_name: str | None,
        away_team_name_provided: bool,
        away_team_name: str | None,
    ) -> MatchDetailResult: ...

    def update_match_lineups_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
        home_player_guids: list[str],
        away_player_guids: list[str],
    ) -> MatchDetailResult: ...

    def list_season_matches(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        page: int,
        page_size: int,
    ) -> MatchesPageResult: ...

    def get_match_detail(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
    ) -> MatchDetailResult: ...

    def list_closed_match_insight_rows(
        self,
        *,
        pena_guid: str,
        season_guids: list[str],
    ) -> list[MatchInsightRowResult]: ...

    def delete_match_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
    ) -> None: ...

    def get_standings(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        filters: SeasonPlayerFilters,
        page: int,
        page_size: int,
    ) -> SeasonPlayersPageResult: ...
