from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class GetPenaAccountabilityQuery:
    pena_guid: str


@dataclass(frozen=True)
class ListPenaTransactionsQuery:
    pena_guid: str
    page: int = 1
    page_size: int = 10
    type_filter: str | None = None


@dataclass(frozen=True)
class GetPlayerGuidForAccountQuery:
    account_id: int
