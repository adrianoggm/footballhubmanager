from __future__ import annotations

from dataclasses import dataclass, field

from core.application.policies import FieldUpdate


@dataclass(frozen=True)
class UpdateMembershipForUserCommand:
    pena_guid: str
    account_id: int
    nickname: FieldUpdate[str] = field(default_factory=FieldUpdate.keep)
    role: FieldUpdate[str] = field(default_factory=FieldUpdate.keep)
    position: FieldUpdate[str] = field(default_factory=FieldUpdate.keep)


@dataclass(frozen=True)
class RemoveMembershipForUserCommand:
    pena_guid: str
    account_id: int


@dataclass(frozen=True)
class UpdateMembershipForAdminCommand:
    pena_guid: str
    admin_id: int
    player_guid: str
    nickname: FieldUpdate[str] = field(default_factory=FieldUpdate.keep)
    role: FieldUpdate[str] = field(default_factory=FieldUpdate.keep)
    position: FieldUpdate[str] = field(default_factory=FieldUpdate.keep)


@dataclass(frozen=True)
class RemoveMembershipForAdminCommand:
    pena_guid: str
    admin_id: int
    player_guid: str


@dataclass(frozen=True)
class CreateGuestPlayerCommand:
    pena_guid: str
    admin_id: int
    name: str
    surname1: str
    nationality: str
    surname2: str | None = None
    nickname: str | None = None
    role: str | None = None
    position: str | None = None
