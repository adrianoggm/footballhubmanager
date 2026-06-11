"""Puerto de repositorio para recuperar cuentas autenticables."""

from __future__ import annotations

from typing import Protocol

from auth.domain.models.auth_account import AuthAccount


class AuthAccountRepositoryPort(Protocol):
    def find_user_by_username(self, username: str) -> AuthAccount | None: ...

    def find_admin_by_username(self, username: str) -> AuthAccount | None: ...
