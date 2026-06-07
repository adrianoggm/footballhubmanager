from core.application.models import PenaPlayerFilters, PenaPlayerInfo, PenaPlayersPage
from core.application.ports.pena_player_query_port import (
    PenaPlayerQueryPort,
    PenaPlayersPageResult,
)


class GetPenaPlayersUseCase:
    def __init__(self, repository: PenaPlayerQueryPort):
        self.repository = repository

    def execute(
        self,
        pena_guid: str,
        *,
        filters: PenaPlayerFilters | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> PenaPlayersPage:
        result = self.repository.find_by_pena_guid(
            pena_guid,
            name=filters.name if filters else None,
            surname1=filters.surname1 if filters else None,
            surname2=filters.surname2 if filters else None,
            nationality=filters.nationality if filters else None,
            nickname=filters.nickname if filters else None,
            role=filters.role if filters else None,
            position=filters.position if filters else None,
            search=filters.search if filters else None,
            page=page,
            page_size=page_size,
        )
        return self._to_page(result)

    @staticmethod
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
                )
                for item in result.items
            ],
            page=result.page,
            page_size=result.page_size,
            total=result.total,
        )
