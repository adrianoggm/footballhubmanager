from datetime import date
from typing import Literal

from pydantic import BaseModel


class SeasonPlayerResponse(BaseModel):
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


class SeasonPlayersPageResponse(BaseModel):
    items: list[SeasonPlayerResponse]
    page: int
    page_size: int
    total: int
    total_pages: int


class SeasonPlayersBulkResponse(BaseModel):
    items: list[SeasonPlayerResponse]
    total_registered: int


class SeasonMatchResponse(BaseModel):
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


class MatchInsightsPairResponse(BaseModel):
    leftGuid: str
    rightGuid: str
    matches: int
    wins: int
    draws: int
    losses: int
    label: str
    win_rate: float


class MatchInsightsTeammateResponse(BaseModel):
    player_guid: str
    player_label: str
    partner_guid: str
    partner_label: str
    matches: int
    wins: int
    draws: int
    losses: int
    win_rate: float


class MatchInsightsMatrixPlayerResponse(BaseModel):
    guid: str
    label: str
    appearances: int


class MatchInsightsMatrixCellResponse(BaseModel):
    player_guid: str
    teammate_guid: str
    same_player: bool
    matches: int
    wins: int
    draws: int
    losses: int
    win_rate: float


class MatchInsightsMatrixRowResponse(BaseModel):
    player: MatchInsightsMatrixPlayerResponse
    cells: list[MatchInsightsMatrixCellResponse]


class MatchInsightsTimelineByMatchResponse(BaseModel):
    season_guid: str
    match_guid: str
    match_date: str
    goals: int
    assists: int
    saves: int
    average_players_per_team: float
    home_score: int
    away_score: int
    match_index: int
    label: str
    running_goals_per_match: float
    running_assists_per_match: float
    running_saves_per_match: float


class MatchInsightsTimelineBySeasonResponse(BaseModel):
    season_guid: str
    matches: int
    goals_per_match: float
    assists_per_match: float
    saves_per_match: float
    average_players_per_team: float


class MatchInsightsLeaderResponse(BaseModel):
    guid: str
    label: str
    appearances: int
    wins: int
    draws: int
    losses: int
    goals: int
    assists: int
    saves: int
    win_rate: float


class MatchInsightsLeadersResponse(BaseModel):
    scorers: list[MatchInsightsLeaderResponse]
    assisters: list[MatchInsightsLeaderResponse]
    savers: list[MatchInsightsLeaderResponse]


class MatchInsightsResponse(BaseModel):
    matches_analyzed: int
    seasons_analyzed: int
    total_goals: int
    total_assists: int
    total_saves: int
    goals_per_match: float
    assists_per_match: float
    saves_per_match: float
    average_players_per_team: float
    top_pairs: list[MatchInsightsPairResponse]
    top_teammates_by_player: list[MatchInsightsTeammateResponse]
    matrix_players: list[MatchInsightsMatrixPlayerResponse]
    matrix_rows: list[MatchInsightsMatrixRowResponse]
    timeline_by_match: list[MatchInsightsTimelineByMatchResponse]
    timeline_by_season: list[MatchInsightsTimelineBySeasonResponse]
    leaders: MatchInsightsLeadersResponse
    scope: Literal["selected_season", "all_seasons"] | None = None
    season_guids: list[str]


class SeasonMatchPlayerStatsResponse(BaseModel):
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


class SeasonMatchEventResponse(BaseModel):
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


class SeasonMatchTeamResponse(BaseModel):
    team_guid: str
    team_name: str
    score: int
    total_assists: int
    total_saves: int
    average_rating: float
    players: list[SeasonMatchPlayerStatsResponse]


class SeasonMatchDetailResponse(BaseModel):
    guid: str
    season_guid: str
    match_date: date
    status: str
    tracking_status: str
    started_at_epoch: int | None
    ended_at_epoch: int | None
    elapsed_seconds: int
    home_team: SeasonMatchTeamResponse
    away_team: SeasonMatchTeamResponse
    events: list[SeasonMatchEventResponse]


class SeasonMatchSummaryResponse(BaseModel):
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


class SeasonMatchesPageResponse(BaseModel):
    items: list[SeasonMatchSummaryResponse]
    page: int
    page_size: int
    total: int
    total_pages: int
