from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class PenaLabelsResult:
    role_labels: list[str]
    position_labels: list[str]
    role_colors: dict[str, str]
    position_colors: dict[str, str]


class PenaLabelsPort(Protocol):
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
        role_renames: dict[str, str],
        position_renames: dict[str, str],
    ) -> PenaLabelsResult:
        """Replace the pena label catalogs.

        ``*_renames`` map an existing label to its new text (``old -> new``); the
        players using it keep it under the new name (and colour). Labels that
        disappear without a rename follow the removal policy: removed roles fall
        back to the membership's default role, removed positions become ``None``.
        """
        ...
