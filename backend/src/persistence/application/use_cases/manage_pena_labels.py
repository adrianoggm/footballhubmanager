from dataclasses import dataclass

from persistence.application.ports.pena_labels_repository import (
    PenaLabelsRepository,
)
from persistence.application.ports.pena_labels_repository import (
    PenaNotFoundError as RepositoryPenaNotFoundError,
)
from persistence.application.ports.pena_labels_repository import (
    PenaNotManagedByAdminError as RepositoryPenaNotManagedByAdminError,
)
from persistence.domain.label_config import (
    DEFAULT_POSITION_LABEL_COLORS,
    DEFAULT_ROLE_LABEL_COLORS,
    MAX_LABEL_LENGTH,
    MAX_LABELS,
    align_label_colors,
    clean_labels,
    normalize_hex_color,
)


@dataclass(frozen=True)
class PenaLabelsInfo:
    role_labels: list[str]
    position_labels: list[str]
    role_colors: dict[str, str]
    position_colors: dict[str, str]


@dataclass(frozen=True)
class PenaLabelsUpdate:
    role_labels: list[str]
    position_labels: list[str]
    role_colors: dict[str, str] | None = None
    position_colors: dict[str, str] | None = None


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
            role_colors=labels.role_colors,
            position_colors=labels.position_colors,
        )

    def update_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        update: PenaLabelsUpdate,
    ) -> PenaLabelsInfo:
        role_labels = self._normalize_labels(update.role_labels)
        position_labels = self._normalize_labels(update.position_labels)
        role_colors = self._normalize_colors(
            labels=role_labels,
            values=update.role_colors,
            defaults=DEFAULT_ROLE_LABEL_COLORS,
        )
        position_colors = self._normalize_colors(
            labels=position_labels,
            values=update.position_colors,
            defaults=DEFAULT_POSITION_LABEL_COLORS,
        )
        try:
            labels = self.repository.update_for_admin(
                pena_guid=pena_guid,
                admin_id=admin_id,
                role_labels=role_labels,
                position_labels=position_labels,
                role_colors=role_colors,
                position_colors=position_colors,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaLabelsPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaLabelsAccessDeniedError() from exc
        return PenaLabelsInfo(
            role_labels=labels.role_labels,
            position_labels=labels.position_labels,
            role_colors=labels.role_colors,
            position_colors=labels.position_colors,
        )

    @staticmethod
    def _normalize_labels(values: list[str] | None) -> list[str]:
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

    @staticmethod
    def _normalize_colors(
        *,
        labels: list[str],
        values: dict[str, str] | None,
        defaults: dict[str, str],
    ) -> dict[str, str]:
        if values is not None and not isinstance(values, dict):
            raise InvalidPenaLabelsDataError()

        sanitized: dict[str, str] = {}
        for raw_key, raw_value in (values or {}).items():
            key = str(raw_key or "").strip()
            if not key:
                continue
            color = normalize_hex_color(raw_value)
            if not color:
                raise InvalidPenaLabelsDataError()
            sanitized[key] = color

        return align_label_colors(
            labels,
            configured_colors=sanitized,
            defaults=defaults,
        )
