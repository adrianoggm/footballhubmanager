from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class UpdatePenaProfileCommand:
    pena_guid: str
    admin_id: int
    image_url: str | None = None
