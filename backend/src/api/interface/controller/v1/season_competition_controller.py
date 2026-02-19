import math
from dataclasses import asdict
from datetime import date
from typing import Literal

from auth.dependencies import authorize_pena_access, require_admin
from fastapi import APIRouter, Depends, HTTPException, Query, status
from persistence.application.ports.season_competition_repository import SeasonPlayerFilters
from persistence.application.use_cases import (
    InvalidSeasonMatchDataError,
    InvalidSeasonPlayerBatchDataError,
    InvalidSeasonPlayerUpdateDataError,
    ManageSeasonCompetitionUseCase,
    PenaSeasonAccessDeniedError,
    PenaSeasonNotFoundError,
    PenaSeasonPenaNotFoundError,
    SeasonMatchCreate,
    SeasonMatchCreateDetailed,
    SeasonMatchDetailInfo,
    SeasonMatchesPage,
    SeasonMatchInfo,
    SeasonMatchInvalidPlayersError,
    SeasonMatchLineupLockedError,
    SeasonMatchLineupsUpdate,
    SeasonMatchNotFoundError,
    SeasonMatchPlayersNotInSeasonError,
    SeasonMatchPlayerStatsInfo,
    SeasonMatchPlayerStatsUpdate,
    SeasonMatchResultUpdate,
    SeasonMatchStatsMismatchError,
    SeasonMatchStatsUpdate,
    SeasonMatchTeamCreate,
    SeasonMatchTeamInfo,
    SeasonMatchUpdate,
    SeasonPlayerAlreadyRegisteredError,
    SeasonPlayerInMatchError,
    SeasonPlayerNotFoundError,
    SeasonPlayerNotInPenaError,
    SeasonPlayersPage,
    SeasonPlayerStatsUpdate,
)
from persistence.infrastructure.repository.db.season_competition_repository import (
    SqlAlchemySeasonCompetitionRepository,
)
from persistence.module import get_db
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

router = APIRouter()


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


class SeasonPlayerResponse(BaseModel):
    player_guid: str
    name: str
    surname1: str
    surname2: str | None
    nationality: str
    nickname: str | None
    position: str | None
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
    home_team: SeasonMatchTeamResponse
    away_team: SeasonMatchTeamResponse


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


class SeasonMatchesPageResponse(BaseModel):
    items: list[SeasonMatchSummaryResponse]
    page: int
    page_size: int
    total: int
    total_pages: int


def _page_response(page: SeasonPlayersPage) -> SeasonPlayersPageResponse:
    total_pages = math.ceil(page.total / page.page_size) if page.total else 0
    return SeasonPlayersPageResponse(
        items=[SeasonPlayerResponse(**asdict(item)) for item in page.items],
        page=page.page,
        page_size=page.page_size,
        total=page.total,
        total_pages=total_pages,
    )


def _match_response(match: SeasonMatchInfo) -> SeasonMatchResponse:
    return SeasonMatchResponse(**asdict(match))


def _match_player_response(item: SeasonMatchPlayerStatsInfo) -> SeasonMatchPlayerStatsResponse:
    return SeasonMatchPlayerStatsResponse(**asdict(item))


def _match_team_response(item: SeasonMatchTeamInfo) -> SeasonMatchTeamResponse:
    payload = asdict(item)
    payload["players"] = [_match_player_response(player) for player in item.players]
    return SeasonMatchTeamResponse(**payload)


def _match_detail_response(item: SeasonMatchDetailInfo) -> SeasonMatchDetailResponse:
    return SeasonMatchDetailResponse(
        guid=item.guid,
        season_guid=item.season_guid,
        match_date=item.match_date,
        status=item.status,
        home_team=_match_team_response(item.home_team),
        away_team=_match_team_response(item.away_team),
    )


def _matches_page_response(page: SeasonMatchesPage) -> SeasonMatchesPageResponse:
    total_pages = math.ceil(page.total / page.page_size) if page.total else 0
    return SeasonMatchesPageResponse(
        items=[SeasonMatchSummaryResponse(**asdict(item)) for item in page.items],
        page=page.page,
        page_size=page.page_size,
        total=page.total,
        total_pages=total_pages,
    )


@router.post(
    "/penas/{pena_guid}/seasons/{season_guid}/players",
    response_model=SeasonPlayerResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_player_in_season(
    pena_guid: str,
    season_guid: str,
    payload: RegisterSeasonPlayerRequest,
    admin_session=Depends(require_admin),
    db: Session = Depends(get_db),
):
    repository = SqlAlchemySeasonCompetitionRepository(db)
    use_case = ManageSeasonCompetitionUseCase(repository)
    try:
        registered = use_case.register_player_for_admin(
            pena_guid=pena_guid,
            season_guid=season_guid,
            admin_id=admin_session.user_id,
            player_guid=payload.player_guid,
        )
    except PenaSeasonPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaSeasonNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")
    except PenaSeasonAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin does not manage this pena"
        )
    except SeasonPlayerNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    except SeasonPlayerNotInPenaError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Player is not linked to this pena"
        )
    except SeasonPlayerAlreadyRegisteredError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Player is already registered in this season",
        )
    return SeasonPlayerResponse(**asdict(registered))


@router.post(
    "/penas/{pena_guid}/seasons/{season_guid}/players/bulk",
    response_model=SeasonPlayersBulkResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_players_in_season_bulk(
    pena_guid: str,
    season_guid: str,
    payload: RegisterSeasonPlayersBulkRequest,
    admin_session=Depends(require_admin),
    db: Session = Depends(get_db),
):
    repository = SqlAlchemySeasonCompetitionRepository(db)
    use_case = ManageSeasonCompetitionUseCase(repository)
    try:
        registered = use_case.register_players_bulk_for_admin(
            pena_guid=pena_guid,
            season_guid=season_guid,
            admin_id=admin_session.user_id,
            player_guids=payload.player_guids,
        )
    except InvalidSeasonPlayerBatchDataError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid bulk player registration data",
        )
    except PenaSeasonPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaSeasonNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")
    except PenaSeasonAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin does not manage this pena"
        )
    except SeasonPlayerNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    except SeasonPlayerNotInPenaError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Player is not linked to this pena"
        )
    except SeasonPlayerAlreadyRegisteredError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Player is already registered in this season",
        )
    return SeasonPlayersBulkResponse(
        items=[SeasonPlayerResponse(**asdict(item)) for item in registered],
        total_registered=len(registered),
    )


@router.patch(
    "/penas/{pena_guid}/seasons/{season_guid}/players/{player_guid}",
    response_model=SeasonPlayerResponse,
)
def update_season_player_stats(
    pena_guid: str,
    season_guid: str,
    player_guid: str,
    payload: UpdateSeasonPlayerStatsRequest,
    admin_session=Depends(require_admin),
    db: Session = Depends(get_db),
):
    repository = SqlAlchemySeasonCompetitionRepository(db)
    use_case = ManageSeasonCompetitionUseCase(repository)
    update = SeasonPlayerStatsUpdate(
        wins=payload.wins,
        losses=payload.losses,
        draws=payload.draws,
        quality_level=payload.quality_level,
        wins_provided="wins" in payload.model_fields_set,
        losses_provided="losses" in payload.model_fields_set,
        draws_provided="draws" in payload.model_fields_set,
        quality_level_provided="quality_level" in payload.model_fields_set,
    )
    try:
        updated = use_case.update_player_stats_for_admin(
            pena_guid=pena_guid,
            season_guid=season_guid,
            admin_id=admin_session.user_id,
            player_guid=player_guid,
            update=update,
        )
    except InvalidSeasonPlayerUpdateDataError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid season player update data"
        )
    except PenaSeasonPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaSeasonNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")
    except PenaSeasonAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin does not manage this pena"
        )
    except SeasonPlayerNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Player is not registered in this season"
        )
    return SeasonPlayerResponse(**asdict(updated))


@router.delete(
    "/penas/{pena_guid}/seasons/{season_guid}/players/{player_guid}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def unregister_player_from_season(
    pena_guid: str,
    season_guid: str,
    player_guid: str,
    admin_session=Depends(require_admin),
    db: Session = Depends(get_db),
):
    repository = SqlAlchemySeasonCompetitionRepository(db)
    use_case = ManageSeasonCompetitionUseCase(repository)
    try:
        use_case.unregister_player_for_admin(
            pena_guid=pena_guid,
            season_guid=season_guid,
            admin_id=admin_session.user_id,
            player_guid=player_guid,
        )
    except PenaSeasonPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaSeasonNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")
    except PenaSeasonAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin does not manage this pena"
        )
    except SeasonPlayerNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Player is not registered in this season"
        )
    except SeasonPlayerInMatchError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Player already has matches in this season",
        )


@router.get(
    "/penas/{pena_guid}/seasons/{season_guid}/players", response_model=SeasonPlayersPageResponse
)
def list_season_players(
    pena_guid: str,
    season_guid: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    name: str | None = Query(default=None),
    surname1: str | None = Query(default=None),
    surname2: str | None = Query(default=None),
    nationality: str | None = Query(default=None),
    nickname: str | None = Query(default=None),
    position: str | None = Query(default=None),
    search: str | None = Query(default=None),
    order_by: Literal[
        "quality_level",
        "played",
        "goals",
        "assists",
        "wins",
        "losses",
        "draws",
        "points",
    ] = Query(default="quality_level"),
    order_dir: Literal["asc", "desc"] = Query(default="desc"),
    db: Session = Depends(get_db),
    _session=Depends(authorize_pena_access),
):
    filters = SeasonPlayerFilters(
        name=_clean(name),
        surname1=_clean(surname1),
        surname2=_clean(surname2),
        nationality=_clean(nationality),
        nickname=_clean(nickname),
        position=_clean(position),
        search=_clean(search),
    )
    repository = SqlAlchemySeasonCompetitionRepository(db)
    use_case = ManageSeasonCompetitionUseCase(repository)
    try:
        result = use_case.list_season_players(
            pena_guid=pena_guid,
            season_guid=season_guid,
            filters=filters,
            page=page,
            page_size=page_size,
            order_by=order_by,
            order_dir=order_dir,
        )
    except PenaSeasonPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaSeasonNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")
    return _page_response(result)


@router.post(
    "/penas/{pena_guid}/seasons/{season_guid}/matches",
    response_model=SeasonMatchResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_season_match(
    pena_guid: str,
    season_guid: str,
    payload: CreateSeasonMatchRequest,
    admin_session=Depends(require_admin),
    db: Session = Depends(get_db),
):
    repository = SqlAlchemySeasonCompetitionRepository(db)
    use_case = ManageSeasonCompetitionUseCase(repository)
    try:
        created = use_case.create_match_for_admin(
            pena_guid=pena_guid,
            season_guid=season_guid,
            admin_id=admin_session.user_id,
            data=SeasonMatchCreate(
                home_player_guid=payload.home_player_guid,
                away_player_guid=payload.away_player_guid,
                match_date=payload.match_date,
            ),
        )
    except PenaSeasonPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaSeasonNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")
    except PenaSeasonAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin does not manage this pena"
        )
    except SeasonMatchInvalidPlayersError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="A match requires two different players"
        )
    except SeasonMatchPlayersNotInSeasonError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Both players must be registered in this season",
        )
    except SeasonPlayerNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    return _match_response(created)


@router.patch(
    "/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/result",
    response_model=SeasonMatchResponse,
)
def update_season_match_result(
    pena_guid: str,
    season_guid: str,
    match_guid: str,
    payload: UpdateSeasonMatchResultRequest,
    admin_session=Depends(require_admin),
    db: Session = Depends(get_db),
):
    repository = SqlAlchemySeasonCompetitionRepository(db)
    use_case = ManageSeasonCompetitionUseCase(repository)
    try:
        updated = use_case.update_match_result_for_admin(
            pena_guid=pena_guid,
            season_guid=season_guid,
            match_guid=match_guid,
            admin_id=admin_session.user_id,
            update=SeasonMatchResultUpdate(
                home_score=payload.home_score,
                away_score=payload.away_score,
                update_standings=payload.update_standings,
            ),
        )
    except InvalidSeasonPlayerUpdateDataError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid match result data"
        )
    except InvalidSeasonMatchDataError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Result update is only valid for 1v1 matches. Use match stats for team matches",
        )
    except PenaSeasonPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaSeasonNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")
    except PenaSeasonAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin does not manage this pena"
        )
    except SeasonMatchNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    return _match_response(updated)


@router.patch(
    "/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}",
    response_model=SeasonMatchDetailResponse,
)
def update_season_match(
    pena_guid: str,
    season_guid: str,
    match_guid: str,
    payload: UpdateSeasonMatchRequest,
    admin_session=Depends(require_admin),
    db: Session = Depends(get_db),
):
    repository = SqlAlchemySeasonCompetitionRepository(db)
    use_case = ManageSeasonCompetitionUseCase(repository)
    update = SeasonMatchUpdate(
        match_date=payload.match_date,
        home_team_name=payload.home_team_name,
        away_team_name=payload.away_team_name,
        match_date_provided="match_date" in payload.model_fields_set,
        home_team_name_provided="home_team_name" in payload.model_fields_set,
        away_team_name_provided="away_team_name" in payload.model_fields_set,
    )
    try:
        updated = use_case.update_match_for_admin(
            pena_guid=pena_guid,
            season_guid=season_guid,
            match_guid=match_guid,
            admin_id=admin_session.user_id,
            update=update,
        )
    except InvalidSeasonMatchDataError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid match update data"
        )
    except PenaSeasonPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaSeasonNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")
    except PenaSeasonAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin does not manage this pena"
        )
    except SeasonMatchNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    return _match_detail_response(updated)


@router.post(
    "/penas/{pena_guid}/seasons/{season_guid}/matches/detailed",
    response_model=SeasonMatchDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_season_match_with_lineups(
    pena_guid: str,
    season_guid: str,
    payload: CreateSeasonMatchDetailedRequest,
    admin_session=Depends(require_admin),
    db: Session = Depends(get_db),
):
    repository = SqlAlchemySeasonCompetitionRepository(db)
    use_case = ManageSeasonCompetitionUseCase(repository)
    try:
        created = use_case.create_match_with_lineups_for_admin(
            pena_guid=pena_guid,
            season_guid=season_guid,
            admin_id=admin_session.user_id,
            data=SeasonMatchCreateDetailed(
                match_date=payload.match_date,
                home_team=SeasonMatchTeamCreate(
                    team_name=payload.home_team.team_name,
                    player_guids=payload.home_team.player_guids,
                ),
                away_team=SeasonMatchTeamCreate(
                    team_name=payload.away_team.team_name,
                    player_guids=payload.away_team.player_guids,
                ),
            ),
        )
    except InvalidSeasonMatchDataError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid match data")
    except PenaSeasonPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaSeasonNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")
    except PenaSeasonAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin does not manage this pena"
        )
    except SeasonMatchInvalidPlayersError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A match cannot repeat players across lineups",
        )
    except SeasonMatchPlayersNotInSeasonError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="All called-up players must be registered in this season",
        )
    except SeasonPlayerNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    return _match_detail_response(created)


@router.patch(
    "/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/stats",
    response_model=SeasonMatchDetailResponse,
)
def update_season_match_stats(
    pena_guid: str,
    season_guid: str,
    match_guid: str,
    payload: UpdateSeasonMatchStatsRequest,
    admin_session=Depends(require_admin),
    db: Session = Depends(get_db),
):
    repository = SqlAlchemySeasonCompetitionRepository(db)
    use_case = ManageSeasonCompetitionUseCase(repository)
    try:
        updated = use_case.update_match_stats_for_admin(
            pena_guid=pena_guid,
            season_guid=season_guid,
            match_guid=match_guid,
            admin_id=admin_session.user_id,
            update=SeasonMatchStatsUpdate(
                home_players=[
                    SeasonMatchPlayerStatsUpdate(
                        player_guid=item.player_guid,
                        goals=item.goals,
                        assists=item.assists,
                        saves=item.saves,
                        rating=item.rating,
                    )
                    for item in payload.home_team.players
                ],
                away_players=[
                    SeasonMatchPlayerStatsUpdate(
                        player_guid=item.player_guid,
                        goals=item.goals,
                        assists=item.assists,
                        saves=item.saves,
                        rating=item.rating,
                    )
                    for item in payload.away_team.players
                ],
            ),
        )
    except InvalidSeasonMatchDataError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid match stats data"
        )
    except PenaSeasonPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaSeasonNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")
    except PenaSeasonAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin does not manage this pena"
        )
    except SeasonMatchNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    except SeasonMatchStatsMismatchError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Stats payload must match the exact match lineup",
        )
    return _match_detail_response(updated)


@router.patch(
    "/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/lineups",
    response_model=SeasonMatchDetailResponse,
)
def update_season_match_lineups(
    pena_guid: str,
    season_guid: str,
    match_guid: str,
    payload: UpdateSeasonMatchLineupsRequest,
    admin_session=Depends(require_admin),
    db: Session = Depends(get_db),
):
    repository = SqlAlchemySeasonCompetitionRepository(db)
    use_case = ManageSeasonCompetitionUseCase(repository)
    try:
        updated = use_case.update_match_lineups_for_admin(
            pena_guid=pena_guid,
            season_guid=season_guid,
            match_guid=match_guid,
            admin_id=admin_session.user_id,
            update=SeasonMatchLineupsUpdate(
                home_player_guids=payload.home_team.player_guids,
                away_player_guids=payload.away_team.player_guids,
            ),
        )
    except InvalidSeasonMatchDataError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid lineup update data"
        )
    except PenaSeasonPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaSeasonNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")
    except PenaSeasonAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin does not manage this pena"
        )
    except SeasonMatchNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    except SeasonMatchLineupLockedError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot update lineups after match stats have been recorded",
        )
    except SeasonMatchInvalidPlayersError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A match cannot repeat players across lineups",
        )
    except SeasonMatchPlayersNotInSeasonError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="All called-up players must be registered in this season",
        )
    except SeasonPlayerNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    return _match_detail_response(updated)


@router.get(
    "/penas/{pena_guid}/seasons/{season_guid}/matches",
    response_model=SeasonMatchesPageResponse,
)
def list_season_matches(
    pena_guid: str,
    season_guid: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _session=Depends(authorize_pena_access),
):
    repository = SqlAlchemySeasonCompetitionRepository(db)
    use_case = ManageSeasonCompetitionUseCase(repository)
    try:
        result = use_case.list_season_matches(
            pena_guid=pena_guid,
            season_guid=season_guid,
            page=page,
            page_size=page_size,
        )
    except PenaSeasonPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaSeasonNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")
    return _matches_page_response(result)


@router.get(
    "/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}",
    response_model=SeasonMatchDetailResponse,
)
def get_season_match_detail(
    pena_guid: str,
    season_guid: str,
    match_guid: str,
    db: Session = Depends(get_db),
    _session=Depends(authorize_pena_access),
):
    repository = SqlAlchemySeasonCompetitionRepository(db)
    use_case = ManageSeasonCompetitionUseCase(repository)
    try:
        result = use_case.get_match_detail(
            pena_guid=pena_guid,
            season_guid=season_guid,
            match_guid=match_guid,
        )
    except PenaSeasonPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaSeasonNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")
    except SeasonMatchNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    return _match_detail_response(result)


@router.delete(
    "/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_season_match(
    pena_guid: str,
    season_guid: str,
    match_guid: str,
    admin_session=Depends(require_admin),
    db: Session = Depends(get_db),
):
    repository = SqlAlchemySeasonCompetitionRepository(db)
    use_case = ManageSeasonCompetitionUseCase(repository)
    try:
        use_case.delete_match_for_admin(
            pena_guid=pena_guid,
            season_guid=season_guid,
            match_guid=match_guid,
            admin_id=admin_session.user_id,
        )
    except InvalidSeasonMatchDataError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid match operation"
        )
    except PenaSeasonPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaSeasonNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")
    except PenaSeasonAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin does not manage this pena"
        )
    except SeasonMatchNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")


@router.get(
    "/penas/{pena_guid}/seasons/{season_guid}/standings", response_model=SeasonPlayersPageResponse
)
def get_season_standings(
    pena_guid: str,
    season_guid: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _session=Depends(authorize_pena_access),
):
    repository = SqlAlchemySeasonCompetitionRepository(db)
    use_case = ManageSeasonCompetitionUseCase(repository)
    try:
        result = use_case.get_standings(
            pena_guid=pena_guid,
            season_guid=season_guid,
            page=page,
            page_size=page_size,
        )
    except PenaSeasonPenaNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    except PenaSeasonNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")
    return _page_response(result)
