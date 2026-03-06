from dataclasses import dataclass

from persistence.application.ports.pena_labels_repository import (
    PenaLabelsRepository,
    PenaNotFoundError as RepositoryPenaNotFoundError,
)
from persistence.application.ports.pena_labels_repository import (
    PenaNotManagedByAdminError as RepositoryPenaNotManagedByAdminError,
)
from persistence.domain.label_config import MAX_LABEL_LENGTH, MAX_LABELS, clean_labels


@dataclass(frozen=True)
class PenaLabelsInfo:
    role_labels: list[str]
    position_labels: list[str]


@dataclass(frozen=True)
class PenaLabelsUpdate:
    role_labels: list[str]
    position_labels: list[str]


class PenaLabelsPenaNotFoundError(Exception):
    pass


class PenaLabelsAccessDeniedError(Exception):
    pass


class InvalidPenaLabelsDataError(Exception):
    pass


class ManagePenaLabelsUseCase:
    def __init__(self, repository: PenaLabelsRepository):
        self.repository = repository

    def get_for_pena(self, *, pena_guid: str) -> PenaLabelsInfo:
        try:
            labels = self.repository.get_by_pena_guid(pena_guid=pena_guid)
        except RepositoryPenaNotFoundError as exc:
            raise PenaLabelsPenaNotFoundError() from exc
        return PenaLabelsInfo(
            role_labels=labels.role_labels,
            position_labels=labels.position_labels,
        )

    def update_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        update: PenaLabelsUpdate,
    ) -> PenaLabelsInfo:
        role_labels = self._normalize(update.role_labels)
        position_labels = self._normalize(update.position_labels)
        try:
            labels = self.repository.update_for_admin(
                pena_guid=pena_guid,
                admin_id=admin_id,
                role_labels=role_labels,
                position_labels=position_labels,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaLabelsPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaLabelsAccessDeniedError() from exc
        return PenaLabelsInfo(
            role_labels=labels.role_labels,
            position_labels=labels.position_labels,
        )

    @staticmethod
    def _normalize(values: list[str] | None) -> list[str]:
        if not isinstance(values, list):
            raise InvalidPenaLabelsDataError()
        cleaned = clean_labels(values)
        if not cleaned:
            raise InvalidPenaLabelsDataError()
        if len(cleaned) > MAX_LABELS:
            raise InvalidPenaLabelsDataError()
        if any(len(item) > MAX_LABEL_LENGTH for item in cleaned):
            raise InvalidPenaLabelsDataError()
        return cleaned
