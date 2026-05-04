from dataclasses import dataclass

from persistence.application.ports.player_profile_port import (
    InvalidNationalityError as RepositoryInvalidNationalityError,
)
from persistence.application.ports.player_profile_port import (
    InvalidProfileImageError as RepositoryInvalidProfileImageError,
)
from persistence.application.ports.player_profile_port import (
    PlayerProfilePort,
)
from persistence.application.use_cases.get_player_profile_usecase import (
    GetPlayerProfileUseCase,
    PlayerProfile,
)
from persistence.application.use_cases.profile_image_utils import (
    InvalidProfileImagePayloadError,
    normalize_profile_image_data_url,
)


@dataclass(frozen=True)
class PlayerUpdate:
    name: str | None = None
    surname1: str | None = None
    surname2: str | None = None
    nationality: str | None = None
    image_url: str | None = None


class InvalidNationalityError(Exception):
    pass


class InvalidPlayerUpdateDataError(Exception):
    pass


class InvalidProfileImageError(Exception):
    pass


class UpdatePlayerProfileUseCase:
    def __init__(self, repository: PlayerProfilePort):
        self.repository = repository

    def execute_by_guid(self, player_guid: str, update: PlayerUpdate) -> PlayerProfile | None:
        normalized_name = update.name.strip() if update.name is not None else None
        normalized_surname1 = update.surname1.strip() if update.surname1 is not None else None
        normalized_surname2 = update.surname2.strip() if update.surname2 is not None else None
        normalized_nationality = (
            update.nationality.strip() if update.nationality is not None else None
        )
        try:
            normalized_image_url = normalize_profile_image_data_url(update.image_url)
        except InvalidProfileImagePayloadError as exc:
            raise InvalidProfileImageError() from exc

        if normalized_name == "" or normalized_surname1 == "" or normalized_nationality == "":
            raise InvalidPlayerUpdateDataError()
        if normalized_surname2 == "":
            normalized_surname2 = None

        getter = GetPlayerProfileUseCase(self.repository)
        try:
            updated = self.repository.update_by_guid(
                player_guid,
                name=normalized_name,
                surname1=normalized_surname1,
                surname2=normalized_surname2,
                nationality=normalized_nationality,
                image_url=normalized_image_url,
            )
        except RepositoryInvalidNationalityError as exc:
            raise InvalidNationalityError() from exc
        except RepositoryInvalidProfileImageError as exc:
            raise InvalidProfileImageError() from exc
        if not updated:
            return None
        return getter.execute_by_guid(player_guid)

    def execute_by_account_id(self, account_id: int, update: PlayerUpdate) -> PlayerProfile | None:
        normalized_name = update.name.strip() if update.name is not None else None
        normalized_surname1 = update.surname1.strip() if update.surname1 is not None else None
        normalized_surname2 = update.surname2.strip() if update.surname2 is not None else None
        normalized_nationality = (
            update.nationality.strip() if update.nationality is not None else None
        )
        try:
            normalized_image_url = normalize_profile_image_data_url(update.image_url)
        except InvalidProfileImagePayloadError as exc:
            raise InvalidProfileImageError() from exc

        if normalized_name == "" or normalized_surname1 == "" or normalized_nationality == "":
            raise InvalidPlayerUpdateDataError()
        if normalized_surname2 == "":
            normalized_surname2 = None

        getter = GetPlayerProfileUseCase(self.repository)
        try:
            updated = self.repository.update_by_account_id(
                account_id,
                name=normalized_name,
                surname1=normalized_surname1,
                surname2=normalized_surname2,
                nationality=normalized_nationality,
                image_url=normalized_image_url,
            )
        except RepositoryInvalidNationalityError as exc:
            raise InvalidNationalityError() from exc
        except RepositoryInvalidProfileImageError as exc:
            raise InvalidProfileImageError() from exc
        if not updated:
            return None
        return getter.execute_by_account_id(account_id)
