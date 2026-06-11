from __future__ import annotations

from core.application.commands.update_pena_profile_command import UpdatePenaProfileCommand
from core.application.models import PenaProfileInfo
from core.domain.ports.pena_profile_repository_port import PenaProfileRepositoryPort
from core.domain.value_objects.profile_image import ProfileImage


class UpdatePenaProfileHandler:
    """Orquesta la actualización del perfil. La validación de la imagen vive en
    el Value Object ``ProfileImage``; el repositorio resuelve existencia y
    pertenencia (errores de dominio)."""

    def __init__(self, repository: PenaProfileRepositoryPort) -> None:
        self._repository = repository

    def handle(self, command: UpdatePenaProfileCommand) -> PenaProfileInfo:
        image = ProfileImage.from_optional(command.image_url)
        updated = self._repository.update_for_admin(
            pena_guid=command.pena_guid,
            admin_id=command.admin_id,
            image_url=image.data_url,
        )
        return PenaProfileInfo(guid=updated.guid, name=updated.name, image_url=updated.image_url)
