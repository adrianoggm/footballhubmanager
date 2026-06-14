"""Handlers de los comandos de tokens de enlace de peña."""

from __future__ import annotations

from auth.security import hash_password
from core.application.commands.pena_link_commands import (
    GeneratePenaClaimTokenCommand,
    GeneratePenaLinkTokenCommand,
    LinkExistingAccountToClaimCommand,
    LinkUserToPenaCommand,
    RegisterAndClaimPlayerCommand,
)
from core.application.models import ClaimLink, ClaimRegistration, PenaLinkToken
from core.application.ports.pena_link_port import PenaLinkPort
from core.domain.errors import InvalidLinkTokenError, InvalidRegistrationDataError


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


class GeneratePenaClaimTokenHandler:
    def __init__(self, repository: PenaLinkPort) -> None:
        self._repository = repository

    def handle(self, command: GeneratePenaClaimTokenCommand) -> PenaLinkToken:
        created = self._repository.create_claim_token_for_admin(
            admin_id=command.admin_id,
            pena_guid=command.pena_guid,
            player_guid=command.player_guid,
            ttl_seconds=command.ttl_seconds,
        )
        return PenaLinkToken(
            token=created.token,
            pena_guid=created.pena_guid,
            expires_at=created.expires_at,
            player_guid=created.player_guid,
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


class RegisterAndClaimPlayerHandler:
    def __init__(self, repository: PenaLinkPort) -> None:
        self._repository = repository

    def handle(self, command: RegisterAndClaimPlayerCommand) -> ClaimRegistration:
        token = command.token.strip()
        username = command.username.strip()
        if not token:
            raise InvalidLinkTokenError()
        if not username or not command.password:
            raise InvalidRegistrationDataError()

        result = self._repository.register_and_claim_player(
            token=token,
            username=username,
            password_hash=hash_password(command.password),
        )
        return ClaimRegistration(
            account_id=result.account_id,
            account_guid=result.account_guid,
            player_guid=result.player_guid,
            pena_guid=result.pena_guid,
        )


class LinkExistingAccountToClaimHandler:
    def __init__(self, repository: PenaLinkPort) -> None:
        self._repository = repository

    def handle(self, command: LinkExistingAccountToClaimCommand) -> ClaimLink:
        token = command.token.strip()
        if not token:
            raise InvalidLinkTokenError()

        result = self._repository.link_existing_account_to_player(
            token=token,
            account_id=command.account_id,
        )
        return ClaimLink(player_guid=result.player_guid, pena_guid=result.pena_guid)
