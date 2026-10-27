"""Email address value object (normalized: trimmed + lowercase)."""

from __future__ import annotations

import re
from dataclasses import dataclass

from auth.domain.errors import InvalidEmailError

MAX_EMAIL_LENGTH = 254

# Deliberately pragmatic: one "@", a non-empty local part, a dotted domain and no
# whitespace. Real deliverability is proven by the verification link, not a regex.
_EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@dataclass(frozen=True)
class EmailAddress:
    value: str

    def __post_init__(self) -> None:
        if len(self.value) > MAX_EMAIL_LENGTH or not _EMAIL_PATTERN.match(self.value):
            raise InvalidEmailError()
        if self.value != self.value.strip().lower():
            raise InvalidEmailError("EmailAddress must be built through EmailAddress.parse")

    @classmethod
    def parse(cls, raw: str) -> EmailAddress:
        """Normalize so uniqueness and lookups are case-insensitive."""
        return cls(raw.strip().lower())
