"""Shared kernel: base de todos los errores de dominio.

Todos los bounded contexts derivan sus errores de negocio de ``DomainError``,
de modo que la capa de transporte (FastAPI) pueda mapearlos a HTTP de forma
homogénea y, si hace falta, con un fallback único por tipo base.
"""

from __future__ import annotations


class DomainError(Exception):
    """Error de negocio. Lleva un ``code`` estable para el contrato de la API."""

    code: str = "domain_error"

    def __init__(self, message: str | None = None) -> None:
        super().__init__(message or self.__class__.__name__)
