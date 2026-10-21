from __future__ import annotations

from auth.application.password_reset_tokens import load_usable_reset_token
from auth.application.queries.password_reset_queries import (
    InspectPasswordResetTokenQuery,
    PasswordResetTokenInfoResult,
)
from auth.domain.errors import InvalidAccountTokenError
from auth.domain.ports.account_email_repository_port import AccountEmailRepositoryPort
from auth.domain.ports.clock_port import ClockPort
from auth.domain.ports.password_reset_token_repository_port import (
    PasswordResetTokenRepositoryPort,
)


class InspectPasswordResetTokenHandler:
    def __init__(
        self,
        *,
        accounts: AccountEmailRepositoryPort,
        tokens: PasswordResetTokenRepositoryPort,
        clock: ClockPort,
    ) -> None:
        self._accounts = accounts
        self._tokens = tokens
        self._clock = clock

    def handle(self, query: InspectPasswordResetTokenQuery) -> PasswordResetTokenInfoResult:
        token = load_usable_reset_token(self._tokens, query.token, self._clock.now())
        account = self._accounts.get_account_email(token.ref)
        if account is None:
            raise InvalidAccountTokenError()
        return PasswordResetTokenInfoResult(
            username=account.username,
            account_type=token.ref.account_type.value,
            expires_at=token.expires_at,
        )
