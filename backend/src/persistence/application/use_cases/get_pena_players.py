from dataclasses import dataclass

from persistence.application.ports.pena_player_query_repository import (
    PenaPlayerQueryRepository,
    PenaPlayersPageResult,
)


@dataclass(frozen=True)
class PenaPlayerInfo:
    guid: str
    name: str
    surname1: str
    surname2: str | None
    nationality: str
    nickname: str | None
    role: str | None
    position: str | None


@dataclass(frozen=True)
class PenaPlayerFilters:
    name: str | None = None
    surname1: str | None = None
    surname2: str | None = None
    nationality: str | None = None
    nickname: str | None = None
    role: str | None = None
    position: str | None = None
    search: str | None = None


@dataclass(frozen=True)
class PenaPlayersPage:
    items: list[PenaPlayerInfo]
    page: int
    page_size: int
    total: int


class GetPenaPlayersUseCase:
    def __init__(self, repository: PenaPlayerQueryRepository):
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
