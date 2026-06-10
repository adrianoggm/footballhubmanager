from __future__ import annotations

from core.application.ports.nationality_query_port import NationalityQueryPort
from core.application.queries.nationality_query import GetNationalitiesQuery


class GetNationalitiesHandler:
    def __init__(self, repository: NationalityQueryPort) -> None:
        self._repository = repository

    def handle(self, query: GetNationalitiesQuery) -> list[str]:
        return self._repository.list_names()
