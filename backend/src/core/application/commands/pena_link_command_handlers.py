"""Handlers de los comandos de tokens de enlace de peña."""

from __future__ import annotations

from core.application.commands.pena_link_commands import (
    GeneratePenaLinkTokenCommand,
    LinkUserToPenaCommand,
)
from core.application.models import PenaLinkToken
from core.application.ports.pena_link_port import PenaLinkPort
from core.domain.errors import InvalidLinkTokenError


class GeneratePenaLinkTokenHandler:
    def __init__(self, repository: PenaLinkPort) -> None:
        self._repository = repository

    def handle(self, command: GeneratePenaLinkTokenCommand) -> PenaLinkToken:
        created = self._repository.create_token_for_admin_pena(
            admin_id=command.admin_id,
            pena_guid=command.pena_guid,
            ttl_seconds=command.ttl_seconds,
        )
        return PenaLinkToken(
            token=created.token,
            pena_guid=created.pena_guid,
            expires_at=created.expires_at,
        )


class LinkUserToPenaHandler:
    def __init__(self, repository: PenaLinkPort) -> None:
        self._repository = repository

    def handle(self, command: LinkUserToPenaCommand) -> None:
        normalized_token = command.token.strip()
        normalized_nickname = command.nickname.strip() if command.nickname is not None else None
        normalized_position = command.position.strip() if command.position is not None else None

        if not normalized_token:
            raise InvalidLinkTokenError()
        if normalized_nickname == "":
            normalized_nickname = None
        if normalized_position == "":
            normalized_position = None

        self._repository.consume_token_for_user(
            token=normalized_token,
            account_id=command.account_id,
            nickname=normalized_nickname,
            position=normalized_position,
        )
