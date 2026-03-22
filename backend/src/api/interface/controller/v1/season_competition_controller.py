from typing import Literal

from api.dependencies.use_cases import (
    get_manage_season_matches_use_case,
    get_manage_season_players_use_case,
    get_season_match_insights_use_case,
)
from api.interface.controller.v1.model.request.season_competition_request import (
    CreateSeasonMatchDetailedRequest,
    CreateSeasonMatchEventRequest,
    CreateSeasonMatchRequest,
    MatchInsightsRequest,
    RegisterSeasonPlayerRequest,
    RegisterSeasonPlayersBulkRequest,
    UpdateSeasonMatchLineupsRequest,
    UpdateSeasonMatchRequest,
    UpdateSeasonMatchResultRequest,
    UpdateSeasonMatchStatsRequest,
    UpdateSeasonPlayerStatsRequest,
)
from api.interface.controller.v1.model.response.season_competition_response import (
    MatchInsightsResponse,
    SeasonMatchDetailResponse,
    SeasonMatchesPageResponse,
    SeasonMatchResponse,
    SeasonPlayerResponse,
    SeasonPlayersBulkResponse,
    SeasonPlayersPageResponse,
)
from api.interface.controller.v1.season_competition_presenters import (
    build_season_players_filters,
    clean_text,
    clean_text_many,
    to_season_match_detail_response,
    to_season_match_response,
    to_season_matches_page_response,
    to_season_player_response,
    to_season_players_page_response,
)
from api.middleware.exception_mapper import map_exceptions
from auth.dependencies import authorize_pena_access, require_admin
from fastapi import APIRouter, Depends, Query, status
from persistence.application.use_cases import (
    GetSeasonMatchInsightsUseCase,
    InvalidSeasonMatchDataError,
    InvalidSeasonPlayerUpdateDataError,
    ManageSeasonMatchesUseCase,
    ManageSeasonPlayersUseCase,
    SeasonMatchAlreadyStartedError,
    SeasonMatchCreate,
    SeasonMatchCreateDetailed,
    SeasonMatchEventCreate,
    SeasonMatchEventNotFoundError,
    SeasonMatchEventPlayerNotInMatchError,
    SeasonMatchInvalidPlayersError,
    SeasonMatchClockNotRunningError,
    SeasonMatchLineupsUpdate,
    SeasonMatchLineupLockedError,
    SeasonMatchPlayersNotInSeasonError,
    SeasonMatchPlayerStatsUpdate,
    SeasonMatchResultUpdate,
    SeasonMatchStatsUpdate,
    SeasonMatchTeamCreate,
    SeasonMatchUpdate,
    SeasonPlayerNotFoundError,
    SeasonPlayerStatsUpdate,
)

router = APIRouter()


def _clean(value):
    return clean_text(value)


def _clean_many(values):
    return clean_text_many(values)


def _page_response(page):
    return to_season_players_page_response(page)


def _match_response(match):
    return to_season_match_response(match)


def _match_detail_response(item):
    return to_season_match_detail_response(item)


def _matches_page_response(page):
    return to_season_matches_page_response(page)


SEASON_PLAYER_REGISTRATION_OVERRIDES = {
    SeasonPlayerNotFoundError: (
        status.HTTP_404_NOT_FOUND,
        "Player is not registered in this season",
    ),
}


CREATE_SEASON_MATCH_OVERRIDES = {
    SeasonMatchInvalidPlayersError: (
        status.HTTP_400_BAD_REQUEST,
        "A match requires two different players",
    ),
    SeasonMatchPlayersNotInSeasonError: (
        status.HTTP_409_CONFLICT,
        "Both players must be registered in this season",
    ),
}


UPDATE_SEASON_MATCH_RESULT_OVERRIDES = {
    InvalidSeasonPlayerUpdateDataError: (
        status.HTTP_400_BAD_REQUEST,
        "Invalid match result data",
    ),
    InvalidSeasonMatchDataError: (
        status.HTTP_400_BAD_REQUEST,
        "Manual match result updates are disabled. Use match stats endpoint",
    ),
}


UPDATE_SEASON_MATCH_OVERRIDES = {
    InvalidSeasonMatchDataError: (
        status.HTTP_400_BAD_REQUEST,
        "Invalid match update data",
    ),
}


CREATE_SEASON_MATCH_WITH_LINEUPS_OVERRIDES = {
    InvalidSeasonMatchDataError: (status.HTTP_400_BAD_REQUEST, "Invalid match data"),
}


UPDATE_SEASON_MATCH_STATS_OVERRIDES = {
    InvalidSeasonMatchDataError: (
        status.HTTP_400_BAD_REQUEST,
        "Invalid match stats data",
    ),
}


UPDATE_SEASON_MATCH_LINEUPS_OVERRIDES = {
    InvalidSeasonMatchDataError: (
        status.HTTP_400_BAD_REQUEST,
        "Invalid lineup update data",
    ),
    SeasonMatchLineupLockedError: (
        status.HTTP_409_CONFLICT,
        "Cannot update lineups after match stats have been recorded",
    ),
}


DELETE_SEASON_MATCH_OVERRIDES = {
    InvalidSeasonMatchDataError: (
        status.HTTP_400_BAD_REQUEST,
        "Invalid match operation",
    ),
}


START_SEASON_MATCH_OVERRIDES = {
    SeasonMatchAlreadyStartedError: (
        status.HTTP_409_CONFLICT,
        "Match tracking is already running or has already been started",
    ),
    InvalidSeasonMatchDataError: (
        status.HTTP_400_BAD_REQUEST,
        "Invalid match tracking operation",
    ),
}


STOP_SEASON_MATCH_OVERRIDES = {
    SeasonMatchClockNotRunningError: (
        status.HTTP_409_CONFLICT,
        "Match tracking is not currently running",
    ),
    InvalidSeasonMatchDataError: (
        status.HTTP_400_BAD_REQUEST,
        "Invalid match tracking operation",
    ),
}


CREATE_SEASON_MATCH_EVENT_OVERRIDES = {
    InvalidSeasonMatchDataError: (
        status.HTTP_400_BAD_REQUEST,
        "Invalid match event data",
    ),
    SeasonMatchClockNotRunningError: (
        status.HTTP_409_CONFLICT,
        "Start the match or provide a manual elapsed time before logging events",
    ),
    SeasonMatchEventPlayerNotInMatchError: (
        status.HTTP_409_CONFLICT,
        "Event players must belong to the selected match",
    ),
}


DELETE_SEASON_MATCH_EVENT_OVERRIDES = {
    SeasonMatchEventNotFoundError: (
        status.HTTP_404_NOT_FOUND,
        "Match event not found",
    ),
    InvalidSeasonMatchDataError: (
        status.HTTP_400_BAD_REQUEST,
        "Invalid match event operation",
    ),
}


@router.post(
    "/penas/{pena_guid}/seasons/{season_guid}/players",
    response_model=SeasonPlayerResponse,
    status_code=status.HTTP_201_CREATED,
)
@map_exceptions
def register_player_in_season(
    pena_guid: str,
    season_guid: str,
    payload: RegisterSeasonPlayerRequest,
    admin_session=Depends(require_admin),
    use_case: ManageSeasonPlayersUseCase = Depends(get_manage_season_players_use_case),
):
    registered = use_case.register_player_for_admin(
        pena_guid=pena_guid,
        season_guid=season_guid,
        admin_id=admin_session.user_id,
        player_guid=payload.player_guid,
    )
    return to_season_player_response(registered)


@router.post(
    "/penas/{pena_guid}/seasons/{season_guid}/players/bulk",
    response_model=SeasonPlayersBulkResponse,
    status_code=status.HTTP_201_CREATED,
)
@map_exceptions
def register_players_in_season_bulk(
    pena_guid: str,
    season_guid: str,
    payload: RegisterSeasonPlayersBulkRequest,
    admin_session=Depends(require_admin),
    use_case: ManageSeasonPlayersUseCase = Depends(get_manage_season_players_use_case),
):
    registered = use_case.register_players_bulk_for_admin(
        pena_guid=pena_guid,
        season_guid=season_guid,
        admin_id=admin_session.user_id,
        player_guids=payload.player_guids,
        source_season_guid=payload.source_season_guid,
    )
    return SeasonPlayersBulkResponse(
        items=[to_season_player_response(item) for item in registered],
        total_registered=len(registered),
    )


@router.patch(
    "/penas/{pena_guid}/seasons/{season_guid}/players/{player_guid}",
    response_model=SeasonPlayerResponse,
)
@map_exceptions(overrides=SEASON_PLAYER_REGISTRATION_OVERRIDES)
def update_season_player_stats(
    pena_guid: str,
    season_guid: str,
    player_guid: str,
    payload: UpdateSeasonPlayerStatsRequest,
    admin_session=Depends(require_admin),
    use_case: ManageSeasonPlayersUseCase = Depends(get_manage_season_players_use_case),
):
    update = SeasonPlayerStatsUpdate(
        wins=payload.wins,
        losses=payload.losses,
        draws=payload.draws,
        quality_level=payload.quality_level,
        role=payload.role,
        position=payload.position,
        wins_provided="wins" in payload.model_fields_set,
        losses_provided="losses" in payload.model_fields_set,
        draws_provided="draws" in payload.model_fields_set,
        quality_level_provided="quality_level" in payload.model_fields_set,
        role_provided="role" in payload.model_fields_set,
        position_provided="position" in payload.model_fields_set,
    )
    updated = use_case.update_player_stats_for_admin(
        pena_guid=pena_guid,
        season_guid=season_guid,
        admin_id=admin_session.user_id,
        player_guid=player_guid,
        update=update,
    )
    return to_season_player_response(updated)


@router.delete(
    "/penas/{pena_guid}/seasons/{season_guid}/players/{player_guid}",
    status_code=status.HTTP_204_NO_CONTENT,
)
@map_exceptions(overrides=SEASON_PLAYER_REGISTRATION_OVERRIDES)
def unregister_player_from_season(
    pena_guid: str,
    season_guid: str,
    player_guid: str,
    admin_session=Depends(require_admin),
    use_case: ManageSeasonPlayersUseCase = Depends(get_manage_season_players_use_case),
):
    use_case.unregister_player_for_admin(
        pena_guid=pena_guid,
        season_guid=season_guid,
        admin_id=admin_session.user_id,
        player_guid=player_guid,
    )


@router.get(
    "/penas/{pena_guid}/seasons/{season_guid}/players", response_model=SeasonPlayersPageResponse
)
@map_exceptions
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
    role: list[str] | None = Query(default=None),
    position: list[str] | None = Query(default=None),
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
    use_case: ManageSeasonPlayersUseCase = Depends(get_manage_season_players_use_case),
    _session=Depends(authorize_pena_access),
):
    filters = build_season_players_filters(
        name=name,
        surname1=surname1,
        surname2=surname2,
        nationality=nationality,
        nickname=nickname,
        role=role,
        position=position,
        search=search,
    )
    result = use_case.list_season_players(
        pena_guid=pena_guid,
        season_guid=season_guid,
        filters=filters,
        page=page,
        page_size=page_size,
        order_by=order_by,
        order_dir=order_dir,
    )
    return to_season_players_page_response(result)


@router.post(
    "/penas/{pena_guid}/seasons/{season_guid}/matches",
    response_model=SeasonMatchResponse,
    status_code=status.HTTP_201_CREATED,
)
@map_exceptions(overrides=CREATE_SEASON_MATCH_OVERRIDES)
def create_season_match(
    pena_guid: str,
    season_guid: str,
    payload: CreateSeasonMatchRequest,
    admin_session=Depends(require_admin),
    use_case: ManageSeasonMatchesUseCase = Depends(get_manage_season_matches_use_case),
):
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
    return to_season_match_response(created)


@router.patch(
    "/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/result",
    response_model=SeasonMatchResponse,
)
@map_exceptions(overrides=UPDATE_SEASON_MATCH_RESULT_OVERRIDES)
def update_season_match_result(
    pena_guid: str,
    season_guid: str,
    match_guid: str,
    payload: UpdateSeasonMatchResultRequest,
    admin_session=Depends(require_admin),
    use_case: ManageSeasonMatchesUseCase = Depends(get_manage_season_matches_use_case),
):
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
    return to_season_match_response(updated)


@router.patch(
    "/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}",
    response_model=SeasonMatchDetailResponse,
)
@map_exceptions(overrides=UPDATE_SEASON_MATCH_OVERRIDES)
def update_season_match(
    pena_guid: str,
    season_guid: str,
    match_guid: str,
    payload: UpdateSeasonMatchRequest,
    admin_session=Depends(require_admin),
    use_case: ManageSeasonMatchesUseCase = Depends(get_manage_season_matches_use_case),
):
    update = SeasonMatchUpdate(
        match_date=payload.match_date,
        home_team_name=payload.home_team_name,
        away_team_name=payload.away_team_name,
        match_date_provided="match_date" in payload.model_fields_set,
        home_team_name_provided="home_team_name" in payload.model_fields_set,
        away_team_name_provided="away_team_name" in payload.model_fields_set,
    )
    updated = use_case.update_match_for_admin(
        pena_guid=pena_guid,
        season_guid=season_guid,
        match_guid=match_guid,
        admin_id=admin_session.user_id,
        update=update,
    )
    return to_season_match_detail_response(updated)


@router.post(
    "/penas/{pena_guid}/seasons/{season_guid}/matches/detailed",
    response_model=SeasonMatchDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
@map_exceptions(overrides=CREATE_SEASON_MATCH_WITH_LINEUPS_OVERRIDES)
def create_season_match_with_lineups(
    pena_guid: str,
    season_guid: str,
    payload: CreateSeasonMatchDetailedRequest,
    admin_session=Depends(require_admin),
    use_case: ManageSeasonMatchesUseCase = Depends(get_manage_season_matches_use_case),
):
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
    return to_season_match_detail_response(created)


@router.patch(
    "/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/stats",
    response_model=SeasonMatchDetailResponse,
)
@map_exceptions(overrides=UPDATE_SEASON_MATCH_STATS_OVERRIDES)
def update_season_match_stats(
    pena_guid: str,
    season_guid: str,
    match_guid: str,
    payload: UpdateSeasonMatchStatsRequest,
    admin_session=Depends(require_admin),
    use_case: ManageSeasonMatchesUseCase = Depends(get_manage_season_matches_use_case),
):
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
    return to_season_match_detail_response(updated)


@router.patch(
    "/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/lineups",
    response_model=SeasonMatchDetailResponse,
)
@map_exceptions(overrides=UPDATE_SEASON_MATCH_LINEUPS_OVERRIDES)
def update_season_match_lineups(
    pena_guid: str,
    season_guid: str,
    match_guid: str,
    payload: UpdateSeasonMatchLineupsRequest,
    admin_session=Depends(require_admin),
    use_case: ManageSeasonMatchesUseCase = Depends(get_manage_season_matches_use_case),
):
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
    return to_season_match_detail_response(updated)


@router.post(
    "/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/start",
    response_model=SeasonMatchDetailResponse,
)
@map_exceptions(overrides=START_SEASON_MATCH_OVERRIDES)
def start_season_match(
    pena_guid: str,
    season_guid: str,
    match_guid: str,
    admin_session=Depends(require_admin),
    use_case: ManageSeasonMatchesUseCase = Depends(get_manage_season_matches_use_case),
):
    updated = use_case.start_match_for_admin(
        pena_guid=pena_guid,
        season_guid=season_guid,
        match_guid=match_guid,
        admin_id=admin_session.user_id,
    )
    return to_season_match_detail_response(updated)


@router.post(
    "/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/stop",
    response_model=SeasonMatchDetailResponse,
)
@map_exceptions(overrides=STOP_SEASON_MATCH_OVERRIDES)
def stop_season_match(
    pena_guid: str,
    season_guid: str,
    match_guid: str,
    admin_session=Depends(require_admin),
    use_case: ManageSeasonMatchesUseCase = Depends(get_manage_season_matches_use_case),
):
    updated = use_case.stop_match_for_admin(
        pena_guid=pena_guid,
        season_guid=season_guid,
        match_guid=match_guid,
        admin_id=admin_session.user_id,
    )
    return to_season_match_detail_response(updated)


@router.post(
    "/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/events",
    response_model=SeasonMatchDetailResponse,
)
@map_exceptions(overrides=CREATE_SEASON_MATCH_EVENT_OVERRIDES)
def create_season_match_event(
    pena_guid: str,
    season_guid: str,
    match_guid: str,
    payload: CreateSeasonMatchEventRequest,
    admin_session=Depends(require_admin),
    use_case: ManageSeasonMatchesUseCase = Depends(get_manage_season_matches_use_case),
):
    updated = use_case.create_match_event_for_admin(
        pena_guid=pena_guid,
        season_guid=season_guid,
        match_guid=match_guid,
        admin_id=admin_session.user_id,
        data=SeasonMatchEventCreate(
            event_type=payload.event_type,
            team_side=payload.team_side,
            player_guid=payload.player_guid,
            related_player_guid=payload.related_player_guid,
            note=payload.note,
            elapsed_seconds=payload.elapsed_seconds,
        ),
    )
    return to_season_match_detail_response(updated)


@router.delete(
    "/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/events/{event_guid}",
    response_model=SeasonMatchDetailResponse,
)
@map_exceptions(overrides=DELETE_SEASON_MATCH_EVENT_OVERRIDES)
def delete_season_match_event(
    pena_guid: str,
    season_guid: str,
    match_guid: str,
    event_guid: str,
    admin_session=Depends(require_admin),
    use_case: ManageSeasonMatchesUseCase = Depends(get_manage_season_matches_use_case),
):
    updated = use_case.delete_match_event_for_admin(
        pena_guid=pena_guid,
        season_guid=season_guid,
        match_guid=match_guid,
        event_guid=event_guid,
        admin_id=admin_session.user_id,
    )
    return to_season_match_detail_response(updated)


@router.get(
    "/penas/{pena_guid}/seasons/{season_guid}/matches",
    response_model=SeasonMatchesPageResponse,
)
@map_exceptions
def list_season_matches(
    pena_guid: str,
    season_guid: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    use_case: ManageSeasonMatchesUseCase = Depends(get_manage_season_matches_use_case),
    _session=Depends(authorize_pena_access),
):
    result = use_case.list_season_matches(
        pena_guid=pena_guid,
        season_guid=season_guid,
        page=page,
        page_size=page_size,
    )
    return to_season_matches_page_response(result)


@router.get(
    "/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}",
    response_model=SeasonMatchDetailResponse,
)
@map_exceptions
def get_season_match_detail(
    pena_guid: str,
    season_guid: str,
    match_guid: str,
    use_case: ManageSeasonMatchesUseCase = Depends(get_manage_season_matches_use_case),
    _session=Depends(authorize_pena_access),
):
    result = use_case.get_match_detail(
        pena_guid=pena_guid,
        season_guid=season_guid,
        match_guid=match_guid,
    )
    return to_season_match_detail_response(result)


@router.post(
    "/penas/{pena_guid}/match-insights",
    response_model=MatchInsightsResponse,
)
@map_exceptions
def get_match_insights(
    pena_guid: str,
    payload: MatchInsightsRequest,
    use_case: GetSeasonMatchInsightsUseCase = Depends(get_season_match_insights_use_case),
    _session=Depends(authorize_pena_access),
):
    result = use_case.execute(
        pena_guid=pena_guid,
        season_guids=payload.season_guids,
        scope=payload.scope,
        matrix_size=payload.matrix_size,
        top_pairs_size=payload.top_pairs_size,
        leaders_size=payload.leaders_size,
    )
    return result


@router.delete(
    "/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}",
    status_code=status.HTTP_204_NO_CONTENT,
)
@map_exceptions(overrides=DELETE_SEASON_MATCH_OVERRIDES)
def delete_season_match(
    pena_guid: str,
    season_guid: str,
    match_guid: str,
    admin_session=Depends(require_admin),
    use_case: ManageSeasonMatchesUseCase = Depends(get_manage_season_matches_use_case),
):
    use_case.delete_match_for_admin(
        pena_guid=pena_guid,
        season_guid=season_guid,
        match_guid=match_guid,
        admin_id=admin_session.user_id,
    )


@router.get(
    "/penas/{pena_guid}/seasons/{season_guid}/standings", response_model=SeasonPlayersPageResponse
)
@map_exceptions
def get_season_standings(
    pena_guid: str,
    season_guid: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: list[str] | None = Query(default=None),
    position: list[str] | None = Query(default=None),
    use_case: ManageSeasonPlayersUseCase = Depends(get_manage_season_players_use_case),
    _session=Depends(authorize_pena_access),
):
    result = use_case.get_standings(
        pena_guid=pena_guid,
        season_guid=season_guid,
        filters=build_season_players_filters(
            role=role,
            position=position,
        ),
        page=page,
        page_size=page_size,
    )
    return to_season_players_page_response(result)
