from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class GeneratePenaLinkTokenCommand:
    admin_id: int
    pena_guid: str
    ttl_seconds: int


@dataclass(frozen=True)
class GeneratePenaClaimTokenCommand:
    admin_id: int
    pena_guid: str
    player_guid: str
    ttl_seconds: int


@dataclass(frozen=True)
class LinkUserToPenaCommand:
    token: str
    account_id: int
    nickname: str | None = None
    position: str | None = None


@dataclass(frozen=True)
class RegisterAndClaimPlayerCommand:
    token: str
    username: str
    password: str


@dataclass(frozen=True)
class LinkExistingAccountToClaimCommand:
    token: str
    account_id: int
