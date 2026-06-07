from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class PenaProfileResult:
    guid: str
    name: str
    image_url: str | None


class PenaNotFoundError(Exception):
    pass


class PenaNotManagedByAdminError(Exception):
    pass


class InvalidPenaProfileImageError(Exception):
    pass


class PenaProfilePort(Protocol):
    def update_for_admin(
        self, *, pena_guid: str, admin_id: int, image_url: str | None
    ) -> PenaProfileResult: ...
