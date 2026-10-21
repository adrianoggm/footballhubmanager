"""Throttle for account emails: at most one email of a kind per account per window."""

from __future__ import annotations

from dataclasses import dataclass

from auth.domain.errors import AccountTokenCooldownError


@dataclass(frozen=True)
class TokenCooldownPolicy:
    seconds: int

    def is_cooling_down(self, last_issued_at: int | None, now: int) -> bool:
        return last_issued_at is not None and now - last_issued_at < self.seconds

    def ensure_ready(self, last_issued_at: int | None, now: int) -> None:
        """Authenticated flows surface the throttle to the caller (HTTP 429)."""
        if self.is_cooling_down(last_issued_at, now):
            raise AccountTokenCooldownError()
