"""Lookup shared by the reset-token query and the reset command."""

from __future__ import annotations

from auth.domain.errors import ExpiredAccountTokenError, InvalidAccountTokenError
from auth.domain.models.account_token import AccountToken
from auth.domain.ports.password_reset_token_repository_port import (
    PasswordResetTokenRepositoryPort,
)
from auth.security import hash_account_token


def load_usable_reset_token(
    tokens: PasswordResetTokenRepositoryPort, raw_token: str, now: int
) -> AccountToken:
    """Return the live token or raise; an expired token is discarded on sight."""
    token_hash = hash_account_token(raw_token)
    token = tokens.find(token_hash)
    if token is None:
        raise InvalidAccountTokenError()
    if token.is_expired(now):
        tokens.discard(token_hash)
        raise ExpiredAccountTokenError()
    return token
