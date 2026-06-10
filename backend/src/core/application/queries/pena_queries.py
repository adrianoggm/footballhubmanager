"""Queries del lado de lectura de peñas (CQRS).

En CQRS el lado de lectura trabaja con read-models de aplicación y se apoya en
el puerto de consulta (``PenaQueryPort``), sin pasar por el dominio.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ListPenasForAdminQuery:
    admin_id: int
    page: int = 1
    page_size: int = 20
    search: str | None = None


@dataclass(frozen=True)
class ListPenasForUserQuery:
    account_id: int
    page: int = 1
    page_size: int = 20
    search: str | None = None


@dataclass(frozen=True)
class GetPenaByGuidQuery:
    pena_guid: str
