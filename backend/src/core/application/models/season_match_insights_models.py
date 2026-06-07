from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class MatchInsightRow:
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


@dataclass(frozen=True)
class MatchPlayerStats:
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
class MatchTeam:
    team_guid: str
    team_name: str
    score: int
    total_assists: int
    total_saves: int
    average_rating: float
    players: list[MatchPlayerStats]


@dataclass(frozen=True)
class MatchDetail:
    guid: str
    season_guid: str
    match_date: date
    status: str
    tracking_status: str
    started_at_epoch: int | None
    ended_at_epoch: int | None
    elapsed_seconds: int
    home_team: MatchTeam
    away_team: MatchTeam
    events: list[dict]
