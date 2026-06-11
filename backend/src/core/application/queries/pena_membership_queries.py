from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class GetPenaMembershipForPlayerQuery:
    pena_guid: str
    player_guid: str


@dataclass(frozen=True)
class GetPenaMembershipForUserQuery:
    pena_guid: str
    account_id: int
