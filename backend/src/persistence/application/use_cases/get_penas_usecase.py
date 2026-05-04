from dataclasses import dataclass

from persistence.application.ports.pena_query_port import (
    PenaQueryPort,
    PenasPageResult,
)


@dataclass(frozen=True)
class PenaInfo:
    guid: str
    name: str
    image_url: str | None = None


@dataclass(frozen=True)
class PenasPage:
    items: list[PenaInfo]
    page: int
    page_size: int
    total: int


class GetPenasUseCase:
    def __init__(self, repository: PenaQueryPort):
        self.repository = repository

    def execute_for_admin(
        self,
        admin_id: int,
        *,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
    ) -> PenasPage:
        result = self.repository.find_for_admin(
            admin_id, page=page, page_size=page_size, search=search
        )
        return self._to_page(result)

    def execute_for_user(
        self,
        account_id: int,
        *,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
    ) -> PenasPage:
        result = self.repository.find_for_user(
            account_id, page=page, page_size=page_size, search=search
        )
        return self._to_page(result)

    def execute_by_guid(self, pena_guid: str) -> PenaInfo | None:
        pena = self.repository.find_by_guid(pena_guid)
        if not pena:
            return None
        return PenaInfo(guid=pena.guid, name=pena.name, image_url=pena.image_url)

    @staticmethod
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
