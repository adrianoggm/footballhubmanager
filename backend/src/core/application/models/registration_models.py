from dataclasses import dataclass


@dataclass(frozen=True)
class AdminRegistration:
    username: str
    password: str
    name: str


@dataclass(frozen=True)
class RegisteredAdmin:
    admin_id: int
    admin_guid: str


@dataclass(frozen=True)
class UserRegistration:
    username: str
    password: str
    name: str
    surname1: str
    surname2: str | None
    nationality: str


@dataclass(frozen=True)
class RegisteredUser:
    account_id: int
    account_guid: str
    player_guid: str
