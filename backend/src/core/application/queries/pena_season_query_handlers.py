"""Handlers de las queries de lectura de temporadas de peña."""

from __future__ import annotations

from datetime import date

from core.application.models import PenaSeasonInfo, PenaSeasonsPage
from core.application.ports.pena_season_port import (
    PenaSeasonPort,
    PenaSeasonResult,
    PenaSeasonsPageResult,
)
from core.application.queries.pena_season_queries import (
    GetActivePenaSeasonQuery,
    GetPenaSeasonQuery,
    ListPenaSeasonsQuery,
)
from core.domain.errors import PenaSeasonNotFoundError


def _to_info(season: PenaSeasonResult) -> PenaSeasonInfo:
    return PenaSeasonInfo(
        guid=season.guid,
        start_date=season.start_date,
        end_date=season.end_date,
        points_win=season.points_win,
        points_draw=season.points_draw,
        points_loss=season.points_loss,
    )


def _to_page(result: PenaSeasonsPageResult) -> PenaSeasonsPage:
    return PenaSeasonsPage(
        items=[_to_info(item) for item in result.items],
        page=result.page,
        page_size=result.page_size,
        total=result.total,
    )


class ListPenaSeasonsHandler:
    def __init__(self, repository: PenaSeasonPort) -> None:
        self._repository = repository

    def handle(self, query: ListPenaSeasonsQuery) -> PenaSeasonsPage:
        result = self._repository.find_for_pena(
            pena_guid=query.pena_guid, page=query.page, page_size=query.page_size
        )
        return _to_page(result)


class GetPenaSeasonHandler:
    def __init__(self, repository: PenaSeasonPort) -> None:
        self._repository = repository

    def handle(self, query: GetPenaSeasonQuery) -> PenaSeasonInfo:
        season = self._repository.find_by_guid(
            pena_guid=query.pena_guid, season_guid=query.season_guid
        )
        if not season:
            raise PenaSeasonNotFoundError()
        return _to_info(season)


class GetActivePenaSeasonHandler:
    def __init__(self, repository: PenaSeasonPort) -> None:
        self._repository = repository

    def handle(self, query: GetActivePenaSeasonQuery) -> PenaSeasonInfo:
        reference_date = query.reference_date or date.today()
        season = self._repository.find_active_for_pena(
            pena_guid=query.pena_guid, reference_date=reference_date
        )
        if not season:
            raise PenaSeasonNotFoundError()
        return _to_info(season)
