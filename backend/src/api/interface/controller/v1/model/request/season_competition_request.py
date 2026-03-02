from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class RegisterSeasonPlayerRequest(BaseModel):
    player_guid: str = Field(min_length=1)


class RegisterSeasonPlayersBulkRequest(BaseModel):
    player_guids: list[str] = Field(min_length=1)


class UpdateSeasonPlayerStatsRequest(BaseModel):
    wins: int | None = Field(default=None, ge=0)
    losses: int | None = Field(default=None, ge=0)
    draws: int | None = Field(default=None, ge=0)
    quality_level: float | None = Field(default=None, ge=0)


class CreateSeasonMatchRequest(BaseModel):
    home_player_guid: str = Field(min_length=1)
    away_player_guid: str = Field(min_length=1)
    match_date: date


class UpdateSeasonMatchResultRequest(BaseModel):
    home_score: int = Field(ge=0)
    away_score: int = Field(ge=0)
    update_standings: bool = True


class UpdateSeasonMatchRequest(BaseModel):
    match_date: date | None = None
    home_team_name: str | None = None
    away_team_name: str | None = None


class MatchTeamCreateRequest(BaseModel):
    team_name: str | None = None
    player_guids: list[str] = Field(min_length=1)


class CreateSeasonMatchDetailedRequest(BaseModel):
    match_date: date
    home_team: MatchTeamCreateRequest
    away_team: MatchTeamCreateRequest


class MatchPlayerStatsRequest(BaseModel):
    player_guid: str = Field(min_length=1)
    goals: int = Field(default=0, ge=0)
    assists: int = Field(default=0, ge=0)
    saves: int = Field(default=0, ge=0)
    rating: float = Field(default=0.0, ge=0)


class MatchTeamStatsRequest(BaseModel):
    players: list[MatchPlayerStatsRequest] = Field(min_length=1)


class UpdateSeasonMatchStatsRequest(BaseModel):
    home_team: MatchTeamStatsRequest
    away_team: MatchTeamStatsRequest


class MatchTeamLineupsRequest(BaseModel):
    player_guids: list[str] = Field(min_length=1)


class UpdateSeasonMatchLineupsRequest(BaseModel):
    home_team: MatchTeamLineupsRequest
    away_team: MatchTeamLineupsRequest


class MatchInsightsRequest(BaseModel):
    season_guids: list[str] = Field(min_length=1)
    scope: Literal["selected_season", "all_seasons"] | None = None
    matrix_size: int = Field(default=8, ge=2, le=20)
    top_pairs_size: int = Field(default=10, ge=1, le=50)
    leaders_size: int = Field(default=5, ge=1, le=20)
