"""Handlers de las queries de lectura de peñas."""

from __future__ import annotations

from core.application.models import PenaInfo, PenasPage, PenasPageResult
from core.application.ports.pena_query_port import PenaQueryPort
from core.application.queries.pena_queries import (
    GetPenaByGuidQuery,
    ListPenasForAdminQuery,
    ListPenasForUserQuery,
)


def _to_page(result: PenasPageResult) -> PenasPage:
    return PenasPage(
        items=[
            PenaInfo(guid=item.guid, name=item.name, image_url=item.image_url)
            for item in result.items
        ],
        page=result.page,
        page_size=result.page_size,
        total=result.total,
    )


class ListPenasForAdminHandler:
    def __init__(self, repository: PenaQueryPort) -> None:
        self._repository = repository

    def handle(self, query: ListPenasForAdminQuery) -> PenasPage:
        result = self._repository.find_for_admin(
            query.admin_id, page=query.page, page_size=query.page_size, search=query.search
        )
        return _to_page(result)


class ListPenasForUserHandler:
    def __init__(self, repository: PenaQueryPort) -> None:
        self._repository = repository

    def handle(self, query: ListPenasForUserQuery) -> PenasPage:
        result = self._repository.find_for_user(
            query.account_id, page=query.page, page_size=query.page_size, search=query.search
        )
        return _to_page(result)


class GetPenaByGuidHandler:
    def __init__(self, repository: PenaQueryPort) -> None:
        self._repository = repository

    def handle(self, query: GetPenaByGuidQuery) -> PenaInfo | None:
        pena = self._repository.find_by_guid(query.pena_guid)
        if not pena:
            return None
        return PenaInfo(guid=pena.guid, name=pena.name, image_url=pena.image_url)
