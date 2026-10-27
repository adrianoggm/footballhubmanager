"""Shared persistence for one purpose of ``account_token`` rows.

Concrete repositories fix the purpose and add their purpose-specific consume step.
"""

from __future__ import annotations

from auth.domain.models.account_email import AccountRef
from auth.domain.models.account_token import AccountToken, AccountTokenPurpose
from auth.infrastructure.mappers.account_mappers import AccountTokenMapper
from persistence.infrastructure.entity import AccountToken as AccountTokenEntity
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session


class SqlAlchemyAccountTokenStore:
    purpose: AccountTokenPurpose

    def __init__(self, session: Session):
        self.session = session

    def replace_token(self, token: AccountToken) -> None:
        # Housekeeping: drop expired tokens of any purpose/account on each issue.
        self.session.execute(
            delete(AccountTokenEntity).where(AccountTokenEntity.expires_at <= token.created_at)
        )
        self.session.execute(self._delete_for_account(token.ref))
        self.session.add(AccountTokenMapper.to_entity(token))
        self.session.commit()

    def last_issued_at(self, ref: AccountRef) -> int | None:
        return self.session.execute(
            select(func.max(AccountTokenEntity.created_at)).where(
                AccountTokenEntity.account_type == ref.account_type.value,
                AccountTokenEntity.account_id == ref.account_id,
                AccountTokenEntity.purpose == self.purpose.value,
            )
        ).scalar_one_or_none()

    def find(self, token_hash: str) -> AccountToken | None:
        row = self.session.execute(
            select(AccountTokenEntity).where(
                AccountTokenEntity.token_hash == token_hash,
                AccountTokenEntity.purpose == self.purpose.value,
            )
        ).scalar_one_or_none()
        return AccountTokenMapper.to_domain(row) if row is not None else None

    def discard(self, token_hash: str) -> None:
        self.session.execute(
            delete(AccountTokenEntity).where(
                AccountTokenEntity.token_hash == token_hash,
                AccountTokenEntity.purpose == self.purpose.value,
            )
        )
        self.session.commit()

    def _consume(self, token_hash: str) -> bool:
        """Delete the token inside the caller's transaction; False if already gone."""
        result = self.session.execute(
            delete(AccountTokenEntity).where(
                AccountTokenEntity.token_hash == token_hash,
                AccountTokenEntity.purpose == self.purpose.value,
            )
        )
        return result.rowcount == 1

    def _delete_for_account(self, ref: AccountRef):
        return delete(AccountTokenEntity).where(
            AccountTokenEntity.account_type == ref.account_type.value,
            AccountTokenEntity.account_id == ref.account_id,
            AccountTokenEntity.purpose == self.purpose.value,
        )
