from dataclasses import dataclass

from persistence.application.ports.pena_profile_port import (
    InvalidPenaProfileImageError as RepositoryInvalidPenaProfileImageError,
)
from persistence.application.ports.pena_profile_port import (
    PenaNotFoundError as RepositoryPenaNotFoundError,
)
from persistence.application.ports.pena_profile_port import (
    PenaNotManagedByAdminError as RepositoryPenaNotManagedByAdminError,
)
from persistence.application.ports.pena_profile_port import (
    PenaProfilePort,
)
from persistence.application.use_cases.profile_image_utils import (
    InvalidProfileImagePayloadError,
    normalize_profile_image_data_url,
)


@dataclass(frozen=True)
class PenaProfileInfo:
    guid: str
    name: str
    image_url: str | None


@dataclass(frozen=True)
class PenaProfileUpdate:
    image_url: str | None = None


class PenaProfileNotFoundError(Exception):
    pass


class PenaProfileAccessDeniedError(Exception):
    pass


class InvalidPenaProfileImageError(Exception):
    pass


class ManagePenaProfileUseCase:
    def __init__(self, repository: PenaProfilePort):
        self.repository = repository

    def update_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        update: PenaProfileUpdate,
    ) -> PenaProfileInfo:
        try:
            normalized_image_url = normalize_profile_image_data_url(update.image_url)
        except InvalidProfileImagePayloadError as exc:
            raise InvalidPenaProfileImageError() from exc

        try:
            updated = self.repository.update_for_admin(
                pena_guid=pena_guid,
                admin_id=admin_id,
                image_url=normalized_image_url,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaProfileNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaProfileAccessDeniedError() from exc
        except RepositoryInvalidPenaProfileImageError as exc:
            raise InvalidPenaProfileImageError() from exc

        return PenaProfileInfo(guid=updated.guid, name=updated.name, image_url=updated.image_url)
