from dataclasses import dataclass, field

from core.application.policies import FieldUpdate


@dataclass(frozen=True)
class PenaMembershipInfo:
    pena_guid: str
    player_guid: str
    name: str
    surname1: str
    surname2: str | None
    nationality: str
    nickname: str | None
    position: str | None
    role: str


@dataclass(frozen=True)
class PenaMembershipUpdate:
    nickname: FieldUpdate[str | None] = field(default_factory=FieldUpdate.keep)
    role: FieldUpdate[str | None] = field(default_factory=FieldUpdate.keep)
    position: FieldUpdate[str | None] = field(default_factory=FieldUpdate.keep)


@dataclass(frozen=True)
class PenaGuestPlayerCreate:
    name: str
    surname1: str
    surname2: str | None = None
    nationality: str = ""
    nickname: str | None = None
    role: str | None = None
    position: str | None = None
