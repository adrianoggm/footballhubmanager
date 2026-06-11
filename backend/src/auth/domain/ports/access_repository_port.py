"""Puerto de repositorio para resolver autorizaciones de acceso a recursos."""

from __future__ import annotations

from typing import Protocol


class AccessRepositoryPort(Protocol):
    def admin_manages_pena(self, *, admin_id: int, pena_guid: str) -> bool: ...

    def user_belongs_to_pena(self, *, account_id: int, pena_guid: str) -> bool: ...

    def user_owns_player(self, *, account_id: int, player_guid: str) -> bool: ...

    def admin_manages_player(self, *, admin_id: int, player_guid: str) -> bool: ...
