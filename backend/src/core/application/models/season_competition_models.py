from dataclasses import dataclass, field
from datetime import date

from core.application.policies import FieldUpdate, StandingsUpdatePolicy


@dataclass(frozen=True)
class SeasonPlayerInfo:
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
class SeasonPlayersPage:
    items: list[SeasonPlayerInfo]
    page: int
    page_size: int
    total: int


@dataclass(frozen=True)
class SeasonPlayersFilters:
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
class SeasonPlayerStatsUpdate:
    wins: FieldUpdate[int] = field(default_factory=FieldUpdate.keep)
    losses: FieldUpdate[int] = field(default_factory=FieldUpdate.keep)
    draws: FieldUpdate[int] = field(default_factory=FieldUpdate.keep)
    quality_level: FieldUpdate[float] = field(default_factory=FieldUpdate.keep)
    role: FieldUpdate[str | None] = field(default_factory=FieldUpdate.keep)
    position: FieldUpdate[str | None] = field(default_factory=FieldUpdate.keep)


@dataclass(frozen=True)
class SeasonMatchCreate:
    home_player_guid: str
    away_player_guid: str
    match_date: date


@dataclass(frozen=True)
class SeasonMatchTeamCreate:
    player_guids: list[str]
    team_name: str | None = None


@dataclass(frozen=True)
class SeasonMatchCreateDetailed:
    match_date: date
    home_team: SeasonMatchTeamCreate
    away_team: SeasonMatchTeamCreate


@dataclass(frozen=True)
class SeasonMatchUpdate:
    match_date: FieldUpdate[date] = field(default_factory=FieldUpdate.keep)
    home_team_name: FieldUpdate[str | None] = field(default_factory=FieldUpdate.keep)
    away_team_name: FieldUpdate[str | None] = field(default_factory=FieldUpdate.keep)


@dataclass(frozen=True)
class SeasonMatchResultUpdate:
    home_score: int
    away_score: int
    standings_policy: StandingsUpdatePolicy = StandingsUpdatePolicy.APPLY


@dataclass(frozen=True)
class SeasonMatchPlayerStatsUpdate:
    player_guid: str
    goals: int = 0
    assists: int = 0
    saves: int = 0
    rating: float = 0.0


@dataclass(frozen=True)
class SeasonMatchStatsUpdate:
    home_players: list[SeasonMatchPlayerStatsUpdate]
    away_players: list[SeasonMatchPlayerStatsUpdate]


@dataclass(frozen=True)
class SeasonMatchLineupsUpdate:
    home_player_guids: list[str]
    away_player_guids: list[str]


@dataclass(frozen=True)
class SeasonMatchEventCreate:
    event_type: str
    team_side: str
    player_guid: str | None = None
    related_player_guid: str | None = None
    note: str | None = None
    elapsed_seconds: int | None = None
    value_delta: int = 1


@dataclass(frozen=True)
class SeasonMatchInfo:
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
class SeasonMatchPlayerStatsInfo:
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
class SeasonMatchEventInfo:
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
class SeasonMatchTeamInfo:
    team_guid: str
    team_name: str
    score: int
    total_assists: int
    total_saves: int
    average_rating: float
    players: list[SeasonMatchPlayerStatsInfo]


@dataclass(frozen=True)
class SeasonMatchDetailInfo:
    guid: str
    season_guid: str
    match_date: date
    status: str
    tracking_status: str
    started_at_epoch: int | None
    ended_at_epoch: int | None
    elapsed_seconds: int
    home_team: SeasonMatchTeamInfo
    away_team: SeasonMatchTeamInfo
    events: list[SeasonMatchEventInfo]
    lineup_change_count: int = 0
    lineup_updated_at_epoch: int | None = None


@dataclass(frozen=True)
class SeasonMatchSummaryInfo:
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
    lineup_change_count: int = 0
    lineup_updated_at_epoch: int | None = None


@dataclass(frozen=True)
class SeasonMatchesPage:
    items: list[SeasonMatchSummaryInfo]
    page: int
    page_size: int
    total: int
