"""Modelo de dominio que representa una cuenta autenticable (user o admin)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AuthAccount:
    id: int
    guid: str
    username: str
    password_hash: str
    user_type: str
