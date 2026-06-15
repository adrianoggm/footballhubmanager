from __future__ import annotations

from core.application.models import PenaPlayerInfo, PenaPlayersPage
from core.application.ports.pena_player_query_port import (
    PenaPlayerQueryPort,
    PenaPlayersPageResult,
)
from core.application.queries.pena_players_query import GetPenaPlayersQuery


def _to_page(result: PenaPlayersPageResult) -> PenaPlayersPage:
    return PenaPlayersPage(
        items=[
            PenaPlayerInfo(
                guid=item.guid,
                name=item.name,
                surname1=item.surname1,
                surname2=item.surname2,
                nationality=item.nationality,
                nickname=item.nickname,
                role=item.role,
                position=item.position,
                has_account=item.has_account,
            )
            for item in result.items
        ],
        page=result.page,
        page_size=result.page_size,
        total=result.total,
    )


class GetPenaPlayersHandler:
    def __init__(self, repository: PenaPlayerQueryPort) -> None:
        self._repository = repository

    def handle(self, query: GetPenaPlayersQuery) -> PenaPlayersPage:
        filters = query.filters
        result = self._repository.find_by_pena_guid(
            query.pena_guid,
            name=filters.name if filters else None,
            surname1=filters.surname1 if filters else None,
            surname2=filters.surname2 if filters else None,
            nationality=filters.nationality if filters else None,
            nickname=filters.nickname if filters else None,
            role=filters.role if filters else None,
            position=filters.position if filters else None,
            search=filters.search if filters else None,
            page=query.page,
            page_size=query.page_size,
        )
        return _to_page(result)
