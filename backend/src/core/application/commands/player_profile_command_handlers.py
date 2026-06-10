"""Handlers de los comandos de actualización de perfil de jugador.

La imagen se valida con el Value Object de dominio ``ProfileImage``; la
normalización de nombres/apellidos/nacionalidad y las reglas de campos vacíos
viven en el handler (entrada de aplicación).
"""

from __future__ import annotations

from dataclasses import dataclass

from core.application.commands.player_profile_commands import (
    UpdatePlayerProfileByAccountIdCommand,
    UpdatePlayerProfileByGuidCommand,
)
from core.application.models import PlayerProfile
from core.application.ports.player_profile_port import PlayerProfilePort
from core.application.queries.player_profile_query_handlers import to_player_profile
from core.domain.errors import InvalidPlayerUpdateDataError
from core.domain.value_objects.profile_image import ProfileImage


@dataclass(frozen=True)
class _NormalizedUpdate:
    name: str | None
    surname1: str | None
    surname2: str | None
    nationality: str | None
    image_url: str | None


def _normalize(
    *,
    name: str | None,
    surname1: str | None,
    surname2: str | None,
    nationality: str | None,
    image_url: str | None,
) -> _NormalizedUpdate:
    normalized_name = name.strip() if name is not None else None
    normalized_surname1 = surname1.strip() if surname1 is not None else None
    normalized_surname2 = surname2.strip() if surname2 is not None else None
    normalized_nationality = nationality.strip() if nationality is not None else None
    # El VO valida y normaliza el data URL (lanza InvalidProfileImageError).
    normalized_image_url = ProfileImage.from_optional(image_url).data_url

    if normalized_name == "" or normalized_surname1 == "" or normalized_nationality == "":
        raise InvalidPlayerUpdateDataError()
    if normalized_surname2 == "":
        normalized_surname2 = None

    return _NormalizedUpdate(
        name=normalized_name,
        surname1=normalized_surname1,
        surname2=normalized_surname2,
        nationality=normalized_nationality,
        image_url=normalized_image_url,
    )


class UpdatePlayerProfileByGuidHandler:
    def __init__(self, repository: PlayerProfilePort) -> None:
        self._repository = repository

    def handle(self, command: UpdatePlayerProfileByGuidCommand) -> PlayerProfile | None:
        update = _normalize(
            name=command.name,
            surname1=command.surname1,
            surname2=command.surname2,
            nationality=command.nationality,
            image_url=command.image_url,
        )
        updated = self._repository.update_by_guid(
            command.player_guid,
            name=update.name,
            surname1=update.surname1,
            surname2=update.surname2,
            nationality=update.nationality,
            image_url=update.image_url,
        )
        if not updated:
            return None
        profile = self._repository.find_by_guid(command.player_guid)
        return to_player_profile(profile) if profile else None


class UpdatePlayerProfileByAccountIdHandler:
    def __init__(self, repository: PlayerProfilePort) -> None:
        self._repository = repository

    def handle(self, command: UpdatePlayerProfileByAccountIdCommand) -> PlayerProfile | None:
        update = _normalize(
            name=command.name,
            surname1=command.surname1,
            surname2=command.surname2,
            nationality=command.nationality,
            image_url=command.image_url,
        )
        updated = self._repository.update_by_account_id(
            command.account_id,
            name=update.name,
            surname1=update.surname1,
            surname2=update.surname2,
            nationality=update.nationality,
            image_url=update.image_url,
        )
        if not updated:
            return None
        profile = self._repository.find_by_account_id(command.account_id)
        return to_player_profile(profile) if profile else None
