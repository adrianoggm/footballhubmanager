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
    # PL-03: true renames (old label -> new label) applied to the players using them.
    role_renames: dict[str, str] | None = None
    position_renames: dict[str, str] | None = None
