from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class PenaLabelsResult:
    role_labels: list[str]
    position_labels: list[str]
    role_colors: dict[str, str]
    position_colors: dict[str, str]


class PenaNotFoundError(Exception):
    pass


class PenaNotManagedByAdminError(Exception):
    pass


class PenaLabelsRepository(Protocol):
    def get_by_pena_guid(self, *, pena_guid: str) -> PenaLabelsResult: ...

    def update_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        role_labels: list[str],
        position_labels: list[str],
        role_colors: dict[str, str],
        position_colors: dict[str, str],
    ) -> PenaLabelsResult: ...
