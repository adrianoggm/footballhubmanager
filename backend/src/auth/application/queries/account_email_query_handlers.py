from __future__ import annotations

from auth.application.queries.account_email_queries import (
    AccountEmailStatusResult,
    GetAccountEmailQuery,
)
from auth.domain.errors import AccountNotFoundError
from auth.domain.ports.account_email_repository_port import AccountEmailRepositoryPort


class GetAccountEmailHandler:
    def __init__(self, accounts: AccountEmailRepositoryPort) -> None:
        self._accounts = accounts

    def handle(self, query: GetAccountEmailQuery) -> AccountEmailStatusResult:
        account = self._accounts.get_account_email(query.ref)
        if account is None:
            raise AccountNotFoundError()
        return AccountEmailStatusResult(email=account.email, email_verified=account.is_verified)
