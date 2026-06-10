"""Value Object que representa la imagen de perfil (data URL) de una peña.

Encapsula la normalización y la validación de negocio (formato y tamaño máximo)
que antes vivían en ``application/services/profile_image_utils`` y en el
repositorio. Es inmutable y valida sus invariantes al construirse.
"""

from __future__ import annotations

import base64
import re
from dataclasses import dataclass

from core.domain.errors import InvalidProfileImageError

_SUPPORTED_DATA_URL_RE = re.compile(
    r"^data:image/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=\s]+$",
    re.IGNORECASE,
)
_MAX_BYTES = 160 * 1024


def _normalize(value: str | None) -> str:
    return str(value or "").strip().replace("\n", "").replace("\r", "")


def _is_supported(data_url: str) -> bool:
    if not _SUPPORTED_DATA_URL_RE.fullmatch(data_url):
        return False
    _, encoded = data_url.split(",", 1)
    try:
        decoded = base64.b64decode(encoded, validate=True)
    except Exception:
        return False
    return len(decoded) <= _MAX_BYTES


@dataclass(frozen=True)
class ProfileImage:
    """Data URL normalizada de una imagen de perfil, o ``None`` si no hay imagen."""

    data_url: str | None

    @classmethod
    def from_optional(cls, raw: str | None) -> ProfileImage:
        normalized = _normalize(raw)
        if not normalized:
            return cls(None)
        if not _is_supported(normalized):
            raise InvalidProfileImageError()
        return cls(normalized)
