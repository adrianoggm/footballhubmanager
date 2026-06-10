"""Buses CQRS mínimos del shared kernel.

No hay un estándar de facto de CQRS en Python, así que el equipo usa estos buses
custom: mapean el *tipo* de Command/Query a su handler y delegan. Son el único
punto de dispatch (escritura vía ``CommandBus``, lectura vía ``QueryBus``).
"""

from __future__ import annotations

from typing import Any, Protocol


class CommandHandlerProtocol(Protocol):
    def handle(self, command: Any) -> Any: ...


class QueryHandlerProtocol(Protocol):
    def handle(self, query: Any) -> Any: ...


class CommandBus:
    """Mapea tipo de Command -> handler. Punto único de dispatch de escritura."""

    def __init__(self) -> None:
        self._handlers: dict[type, CommandHandlerProtocol] = {}

    def register(self, command_type: type, handler: CommandHandlerProtocol) -> None:
        self._handlers[command_type] = handler

    def dispatch(self, command: Any) -> Any:
        handler = self._handlers.get(type(command))
        if handler is None:
            raise LookupError(f"No hay handler registrado para {type(command).__name__}")
        return handler.handle(command)


class QueryBus:
    """Mapea tipo de Query -> handler. Punto único de dispatch de lectura."""

    def __init__(self) -> None:
        self._handlers: dict[type, QueryHandlerProtocol] = {}

    def register(self, query_type: type, handler: QueryHandlerProtocol) -> None:
        self._handlers[query_type] = handler

    def ask(self, query: Any) -> Any:
        handler = self._handlers.get(type(query))
        if handler is None:
            raise LookupError(f"No hay handler registrado para {type(query).__name__}")
        return handler.handle(query)
