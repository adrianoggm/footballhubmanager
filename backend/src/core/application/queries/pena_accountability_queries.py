from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class GetPenaAccountabilityQuery:
    pena_guid: str


@dataclass(frozen=True)
class GetPlayerGuidForAccountQuery:
    account_id: int
