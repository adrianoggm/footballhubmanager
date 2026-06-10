from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class UpdatePenaLabelsCommand:
    pena_guid: str
    admin_id: int
    role_labels: list[str] | None
    position_labels: list[str] | None
    role_colors: dict[str, str] | None = None
    position_colors: dict[str, str] | None = None
