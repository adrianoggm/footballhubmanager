"""Puerto de repositorio para la gestión del perfil de una peña."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class PenaProfileResult:
    guid: str
    name: str
    image_url: str | None


class PenaProfileRepositoryPort(Protocol):
    def update_for_admin(
        self, *, pena_guid: str, admin_id: int, image_url: str | None
    ) -> PenaProfileResult: ...
