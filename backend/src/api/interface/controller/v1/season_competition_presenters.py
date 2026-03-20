import math
from dataclasses import asdict

from api.interface.controller.v1.model.response.season_competition_response import (
    SeasonMatchDetailResponse,
    SeasonMatchesPageResponse,
    SeasonMatchPlayerStatsResponse,
    SeasonMatchResponse,
    SeasonMatchSummaryResponse,
    SeasonMatchTeamResponse,
    SeasonPlayerResponse,
    SeasonPlayersPageResponse,
)
from persistence.application.use_cases import (
    SeasonMatchDetailInfo,
    SeasonMatchesPage,
    SeasonMatchInfo,
    SeasonMatchPlayerStatsInfo,
    SeasonMatchTeamInfo,
    SeasonPlayerInfo,
    SeasonPlayersFilters,
    SeasonPlayersPage,
)


def clean_text(value: str | None) -> str | None:
    if value is None or not isinstance(value, str):
        return None
    cleaned = value.strip()
    return cleaned or None


def clean_text_many(values: list[str] | tuple[str, ...] | None) -> tuple[str, ...]:
    if not values or not isinstance(values, (list, tuple)):
        return ()
    output: list[str] = []
    seen: set[str] = set()
    for raw in values:
        cleaned = clean_text(raw)
        if not cleaned:
            continue
        key = cleaned.casefold()
        if key in seen:
            continue
        seen.add(key)
        output.append(cleaned)
    return tuple(output)


def build_season_players_filters(
    *,
    name: str | None = None,
    surname1: str | None = None,
    surname2: str | None = None,
    nationality: str | None = None,
    nickname: str | None = None,
    role: list[str] | tuple[str, ...] | None = None,
    position: list[str] | tuple[str, ...] | None = None,
    search: str | None = None,
) -> SeasonPlayersFilters:
    cleaned_roles = clean_text_many(role)
    cleaned_positions = clean_text_many(position)
    return SeasonPlayersFilters(
        name=clean_text(name),
        surname1=clean_text(surname1),
        surname2=clean_text(surname2),
        nationality=clean_text(nationality),
        nickname=clean_text(nickname),
        role=cleaned_roles[0] if len(cleaned_roles) == 1 else None,
        roles=cleaned_roles,
        position=cleaned_positions[0] if len(cleaned_positions) == 1 else None,
        positions=cleaned_positions,
        search=clean_text(search),
    )


def to_season_player_response(item: SeasonPlayerInfo) -> SeasonPlayerResponse:
    return SeasonPlayerResponse(**asdict(item))


def to_season_players_page_response(page: SeasonPlayersPage) -> SeasonPlayersPageResponse:
    total_pages = math.ceil(page.total / page.page_size) if page.total else 0
    return SeasonPlayersPageResponse(
        items=[to_season_player_response(item) for item in page.items],
        page=page.page,
        page_size=page.page_size,
        total=page.total,
        total_pages=total_pages,
    )


def to_season_match_response(match: SeasonMatchInfo) -> SeasonMatchResponse:
    return SeasonMatchResponse(**asdict(match))


def to_season_match_player_response(
    item: SeasonMatchPlayerStatsInfo,
) -> SeasonMatchPlayerStatsResponse:
    return SeasonMatchPlayerStatsResponse(**asdict(item))


def to_season_match_team_response(item: SeasonMatchTeamInfo) -> SeasonMatchTeamResponse:
    payload = asdict(item)
    payload["players"] = [
        to_season_match_player_response(player)
        for player in item.players
    ]
    return SeasonMatchTeamResponse(**payload)


def to_season_match_detail_response(item: SeasonMatchDetailInfo) -> SeasonMatchDetailResponse:
    return SeasonMatchDetailResponse(
        guid=item.guid,
        season_guid=item.season_guid,
        match_date=item.match_date,
        status=item.status,
        home_team=to_season_match_team_response(item.home_team),
        away_team=to_season_match_team_response(item.away_team),
    )


def to_season_matches_page_response(page: SeasonMatchesPage) -> SeasonMatchesPageResponse:
    total_pages = math.ceil(page.total / page.page_size) if page.total else 0
    return SeasonMatchesPageResponse(
        items=[SeasonMatchSummaryResponse(**asdict(item)) for item in page.items],
        page=page.page,
        page_size=page.page_size,
        total=page.total,
        total_pages=total_pages,
    )
