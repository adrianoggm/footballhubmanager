from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RegisterAdminCommand:
    username: str
    password: str
    name: str


@dataclass(frozen=True)
class RegisterUserCommand:
    username: str
    password: str
    name: str
    surname1: str
    surname2: str | None
    nationality: str
