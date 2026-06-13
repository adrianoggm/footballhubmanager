from core.application.models.season_competition_models import (
    SeasonMatchDetailInfo,
    SeasonMatchesPage,
    SeasonMatchEventCreate,
    SeasonMatchEventInfo,
    SeasonMatchInfo,
    SeasonMatchPlayerStatsInfo,
    SeasonMatchPlayerStatsUpdate,
    SeasonMatchSummaryInfo,
    SeasonMatchTeamInfo,
    SeasonPlayerInfo,
    SeasonPlayersFilters,
    SeasonPlayersPage,
)
from core.application.policies import FieldUpdate
from core.application.ports.season_competition_port import (
    MatchDetailResult,
    MatchesPageResult,
    MatchEventCreateData,
    MatchEventResult,
    MatchPlayerStatsResult,
    MatchPlayerStatsUpdateData,
    MatchResult,
    MatchSummaryResult,
    MatchTeamResult,
    SeasonPlayerResult,
    SeasonPlayersPageResult,
)
from core.application.ports.season_competition_port import (
    SeasonPlayerFilters as RepositorySeasonPlayerFilters,
)
from core.application.use_cases.season_competition_errors import (
    InvalidSeasonMatchDataError,
    InvalidSeasonPlayerBatchDataError,
    InvalidSeasonPlayerUpdateDataError,
    SeasonMatchInvalidPlayersError,
)

MATCH_EVENT_TYPES = {
    "goal",
    "assist",
    "save",
    "foul",
    "yellow_card",
    "red_card",
    "sanction",
    "other",
}
MATCH_EVENT_PLAYER_REQUIRED_TYPES = MATCH_EVENT_TYPES - {"other"}
MATCH_EVENT_TEAM_SIDES = {"home", "away", "neutral"}


def validate_stat_value(update: FieldUpdate[int]) -> None:
    if not update.is_set():
        return
    if update.value is None or update.value < 0:
        raise InvalidSeasonPlayerUpdateDataError()


def validate_quality_value(update: FieldUpdate[float]) -> None:
    if not update.is_set():
        return
    if update.value is None or update.value < 0:
        raise InvalidSeasonPlayerUpdateDataError()


def validate_team_lineup(player_guids: list[str]) -> None:
    if not player_guids:
        raise InvalidSeasonMatchDataError()
    cleaned = [item.strip() for item in player_guids if item.strip()]
    if len(cleaned) != len(player_guids):
        raise InvalidSeasonMatchDataError()
    if len(set(cleaned)) != len(cleaned):
        raise SeasonMatchInvalidPlayersError()


def clean_name(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def normalize_optional_text(
    value: str | None,
    *,
    max_length: int,
    invalid_error: type[Exception],
) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    if len(cleaned) > max_length:
        raise invalid_error()
    return cleaned


def normalize_player_guids(player_guids: list[str]) -> list[str]:
    if not player_guids:
        raise InvalidSeasonPlayerBatchDataError()
    cleaned_guids = [player_guid.strip() for player_guid in player_guids if player_guid.strip()]
    if len(cleaned_guids) != len(player_guids):
        raise InvalidSeasonPlayerBatchDataError()
    if len(set(cleaned_guids)) != len(cleaned_guids):
        raise InvalidSeasonPlayerBatchDataError()
    return cleaned_guids


def normalize_player_stats(
    values: list[SeasonMatchPlayerStatsUpdate],
) -> list[MatchPlayerStatsUpdateData]:
    if not values:
        raise InvalidSeasonMatchDataError()
    result: list[MatchPlayerStatsUpdateData] = []
    seen_guids: set[str] = set()
    for item in values:
        player_guid = item.player_guid.strip()
        if not player_guid:
            raise InvalidSeasonMatchDataError()
        if player_guid in seen_guids:
            raise InvalidSeasonMatchDataError()
        if item.goals < 0 or item.assists < 0 or item.saves < 0 or item.rating < 0:
            raise InvalidSeasonMatchDataError()
        seen_guids.add(player_guid)
        result.append(
            MatchPlayerStatsUpdateData(
                player_guid=player_guid,
                goals=item.goals,
                assists=item.assists,
                saves=item.saves,
                rating=item.rating,
            )
        )
    return result


def normalize_match_event(data: SeasonMatchEventCreate) -> MatchEventCreateData:
    event_type = str(data.event_type or "").strip().lower()
    team_side = str(data.team_side or "").strip().lower()
    player_guid = clean_name(data.player_guid)
    related_player_guid = clean_name(data.related_player_guid)
    value_delta = int(data.value_delta)
    note = normalize_optional_text(
        data.note,
        max_length=255,
        invalid_error=InvalidSeasonMatchDataError,
    )

    if event_type not in MATCH_EVENT_TYPES:
        raise InvalidSeasonMatchDataError()
    if team_side not in MATCH_EVENT_TEAM_SIDES:
        raise InvalidSeasonMatchDataError()
    if event_type in MATCH_EVENT_PLAYER_REQUIRED_TYPES and not player_guid:
        raise InvalidSeasonMatchDataError()
    if data.elapsed_seconds is not None and data.elapsed_seconds < 0:
        raise InvalidSeasonMatchDataError()
    if value_delta not in {-1, 1}:
        raise InvalidSeasonMatchDataError()
    if player_guid and related_player_guid and player_guid == related_player_guid:
        raise InvalidSeasonMatchDataError()

    return MatchEventCreateData(
        event_type=event_type,
        team_side=team_side,
        player_guid=player_guid,
        related_player_guid=related_player_guid,
        note=note,
        elapsed_seconds=data.elapsed_seconds,
        value_delta=value_delta,
    )


def to_repository_filters(filters: SeasonPlayersFilters) -> RepositorySeasonPlayerFilters:
    return RepositorySeasonPlayerFilters(
        name=filters.name,
        surname1=filters.surname1,
        surname2=filters.surname2,
        nationality=filters.nationality,
        nickname=filters.nickname,
        role=filters.role,
        roles=filters.roles,
        position=filters.position,
        positions=filters.positions,
        search=filters.search,
    )


def to_player_info(item: SeasonPlayerResult) -> SeasonPlayerInfo:
    return SeasonPlayerInfo(
        player_guid=item.player_guid,
        name=item.name,
        surname1=item.surname1,
        surname2=item.surname2,
        nationality=item.nationality,
        nickname=item.nickname,
        role=item.role,
        role_color=item.role_color,
        position=item.position,
        position_color=item.position_color,
        played=item.played,
        goals=item.goals,
        assists=item.assists,
        wins=item.wins,
        losses=item.losses,
        draws=item.draws,
        quality_level=item.quality_level,
        points=item.points,
    )


def to_players_page(page: SeasonPlayersPageResult) -> SeasonPlayersPage:
    return SeasonPlayersPage(
        items=[to_player_info(item) for item in page.items],
        page=page.page,
        page_size=page.page_size,
        total=page.total,
    )


def to_match_info(item: MatchResult) -> SeasonMatchInfo:
    return SeasonMatchInfo(
        guid=item.guid,
        season_guid=item.season_guid,
        match_date=item.match_date,
        home_player_guid=item.home_player_guid,
        away_player_guid=item.away_player_guid,
        home_player_name=item.home_player_name,
        away_player_name=item.away_player_name,
        status=item.status,
        home_score=item.home_score,
        away_score=item.away_score,
    )


def to_match_player(item: MatchPlayerStatsResult) -> SeasonMatchPlayerStatsInfo:
    return SeasonMatchPlayerStatsInfo(
        player_guid=item.player_guid,
        name=item.name,
        surname1=item.surname1,
        surname2=item.surname2,
        nickname=item.nickname,
        position=item.position,
        goals=item.goals,
        assists=item.assists,
        saves=item.saves,
        rating=item.rating,
    )


def to_match_event(item: MatchEventResult) -> SeasonMatchEventInfo:
    return SeasonMatchEventInfo(
        guid=item.guid,
        event_type=item.event_type,
        team_side=item.team_side,
        elapsed_seconds=item.elapsed_seconds,
        value_delta=item.value_delta,
        player_guid=item.player_guid,
        player_name=item.player_name,
        player_surname1=item.player_surname1,
        player_surname2=item.player_surname2,
        player_nickname=item.player_nickname,
        related_player_guid=item.related_player_guid,
        related_player_name=item.related_player_name,
        related_player_surname1=item.related_player_surname1,
        related_player_surname2=item.related_player_surname2,
        related_player_nickname=item.related_player_nickname,
        note=item.note,
        recorded_at_epoch=item.recorded_at_epoch,
    )


def to_match_team(item: MatchTeamResult) -> SeasonMatchTeamInfo:
    return SeasonMatchTeamInfo(
        team_guid=item.team_guid,
        team_name=item.team_name,
        score=item.score,
        total_assists=item.total_assists,
        total_saves=item.total_saves,
        average_rating=item.average_rating,
        players=[to_match_player(stats) for stats in item.players],
    )


def to_match_detail(item: MatchDetailResult) -> SeasonMatchDetailInfo:
    return SeasonMatchDetailInfo(
        guid=item.guid,
        season_guid=item.season_guid,
        match_date=item.match_date,
        status=item.status,
        tracking_status=item.tracking_status,
        started_at_epoch=item.started_at_epoch,
        ended_at_epoch=item.ended_at_epoch,
        elapsed_seconds=item.elapsed_seconds,
        total_paused_seconds=item.total_paused_seconds,
        goalkeeper_rotation_seconds=item.goalkeeper_rotation_seconds,
        home_team=to_match_team(item.home_team),
        away_team=to_match_team(item.away_team),
        events=[to_match_event(event) for event in item.events],
        lineup_change_count=item.lineup_change_count,
        lineup_updated_at_epoch=item.lineup_updated_at_epoch,
    )


def to_match_summary(item: MatchSummaryResult) -> SeasonMatchSummaryInfo:
    return SeasonMatchSummaryInfo(
        guid=item.guid,
        season_guid=item.season_guid,
        match_date=item.match_date,
        status=item.status,
        home_team_name=item.home_team_name,
        away_team_name=item.away_team_name,
        home_score=item.home_score,
        away_score=item.away_score,
        home_players=item.home_players,
        away_players=item.away_players,
        tracking_status=item.tracking_status,
        started_at_epoch=item.started_at_epoch,
        ended_at_epoch=item.ended_at_epoch,
        elapsed_seconds=item.elapsed_seconds,
        lineup_change_count=item.lineup_change_count,
        lineup_updated_at_epoch=item.lineup_updated_at_epoch,
    )


def to_matches_page(page: MatchesPageResult) -> SeasonMatchesPage:
    return SeasonMatchesPage(
        items=[to_match_summary(item) for item in page.items],
        page=page.page,
        page_size=page.page_size,
        total=page.total,
    )
