from typing import Protocol

from core.application.models import PenasPageResult, PenaSummary


class PenaQueryPort(Protocol):
    def find_for_admin(
        self, admin_id: int, *, page: int, page_size: int, search: str | None
    ) -> PenasPageResult: ...

    def find_for_user(
        self, account_id: int, *, page: int, page_size: int, search: str | None
    ) -> PenasPageResult: ...

    def find_by_guid(self, pena_guid: str) -> PenaSummary | None: ...
