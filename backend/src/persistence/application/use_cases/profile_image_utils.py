import base64
import re

SUPPORTED_PROFILE_IMAGE_DATA_URL_RE = re.compile(
    r"^data:image/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=\s]+$",
    re.IGNORECASE,
)
MAX_PROFILE_IMAGE_BYTES = 160 * 1024


def is_supported_profile_image_data_url(value: str) -> bool:
    normalized = StringNormalizer.normalize(value)
    if not normalized:
        return False
    if not SUPPORTED_PROFILE_IMAGE_DATA_URL_RE.fullmatch(normalized):
        return False
    _, encoded = normalized.split(",", 1)
    try:
        decoded = base64.b64decode(encoded, validate=True)
    except Exception:
        return False
    return len(decoded) <= MAX_PROFILE_IMAGE_BYTES


def normalize_profile_image_data_url(value: str | None) -> str | None:
    normalized = StringNormalizer.normalize(value)
    if not normalized:
        return None
    if not is_supported_profile_image_data_url(normalized):
        raise InvalidProfileImagePayloadError()
    return normalized


class InvalidProfileImagePayloadError(Exception):
    pass


class StringNormalizer:
    @staticmethod
    def normalize(value: str | None) -> str:
        return StringNormalizer._collapse_whitespace(StringNormalizer._coerce(value))

    @staticmethod
    def _coerce(value: str | None) -> str:
        return str(value or "")

    @staticmethod
    def _collapse_whitespace(value: str) -> str:
        return value.strip().replace("\n", "").replace("\r", "")
