from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class UpdatePlayerProfileByGuidCommand:
    player_guid: str
    name: str | None = None
    surname1: str | None = None
    surname2: str | None = None
    nationality: str | None = None
    image_url: str | None = None


@dataclass(frozen=True)
class UpdatePlayerProfileByAccountIdCommand:
    account_id: int
    name: str | None = None
    surname1: str | None = None
    surname2: str | None = None
    nationality: str | None = None
    image_url: str | None = None
