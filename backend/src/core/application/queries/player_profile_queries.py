from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class GetPlayerProfileByGuidQuery:
    player_guid: str


@dataclass(frozen=True)
class GetPlayerProfileByAccountIdQuery:
    account_id: int
