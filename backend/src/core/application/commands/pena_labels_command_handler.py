"""Handler del comando de actualización de etiquetas de peña.

La normalización/validación de etiquetas y colores se apoya en las reglas de
dominio de ``core.domain.label_config``; el handler orquesta y persiste.
"""

from __future__ import annotations

from core.application.commands.pena_labels_command import UpdatePenaLabelsCommand
from core.application.models import PenaLabelsInfo
from core.application.ports.pena_labels_port import PenaLabelsPort
from core.domain.errors import InvalidPenaLabelsDataError
from core.domain.label_config import (
    DEFAULT_POSITION_LABEL_COLORS,
    DEFAULT_ROLE_LABEL_COLORS,
    MAX_LABEL_LENGTH,
    MAX_LABELS,
    align_label_colors,
    clean_labels,
    find_label,
    normalize_hex_color,
)


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

    return align_label_colors(labels, configured_colors=sanitized, defaults=defaults)


def _normalize_renames(
    values: dict[str, str] | None,
    *,
    labels: list[str],
) -> dict[str, str]:
    """Validate ``old -> new`` renames: the target must be one of the new labels.

    Entries whose old and new text only differ in case are still kept (they
    canonicalize the stored casing); exact no-ops are dropped.
    """
    if values is None:
        return {}
    if not isinstance(values, dict):
        raise InvalidPenaLabelsDataError()
    renames: dict[str, str] = {}
    for raw_old, raw_new in values.items():
        old = str(raw_old or "").strip()
        new = find_label(labels, str(raw_new or ""))
        if not old or new is None:
            raise InvalidPenaLabelsDataError()
        if old == new:
            continue
        renames[old] = new
    return renames


def _carry_renamed_colors(
    colors: dict[str, str] | None,
    renames: dict[str, str],
) -> dict[str, str] | None:
    """A renamed label keeps its colour unless the caller sent one for the new text."""
    if not colors or not renames:
        return colors
    carried = dict(colors)
    for old, new in renames.items():
        if new not in carried and old in carried:
            carried[new] = carried[old]
    return carried


class UpdatePenaLabelsHandler:
    def __init__(self, repository: PenaLabelsPort) -> None:
        self._repository = repository

    def handle(self, command: UpdatePenaLabelsCommand) -> PenaLabelsInfo:
        role_labels = _normalize_labels(command.role_labels)
        position_labels = _normalize_labels(command.position_labels)
        role_renames = _normalize_renames(command.role_renames, labels=role_labels)
        position_renames = _normalize_renames(command.position_renames, labels=position_labels)
        role_colors = _normalize_colors(
            labels=role_labels,
            values=_carry_renamed_colors(command.role_colors, role_renames),
            defaults=DEFAULT_ROLE_LABEL_COLORS,
        )
        position_colors = _normalize_colors(
            labels=position_labels,
            values=_carry_renamed_colors(command.position_colors, position_renames),
            defaults=DEFAULT_POSITION_LABEL_COLORS,
        )
        labels = self._repository.update_for_admin(
            pena_guid=command.pena_guid,
            admin_id=command.admin_id,
            role_labels=role_labels,
            position_labels=position_labels,
            role_colors=role_colors,
            position_colors=position_colors,
            role_renames=role_renames,
            position_renames=position_renames,
        )
        return PenaLabelsInfo(
            role_labels=labels.role_labels,
            position_labels=labels.position_labels,
            role_colors=labels.role_colors,
            position_colors=labels.position_colors,
        )
