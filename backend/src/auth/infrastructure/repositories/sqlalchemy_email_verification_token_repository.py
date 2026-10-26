from __future__ import annotations

from auth.domain.models.account_token import AccountToken, AccountTokenPurpose
from auth.domain.ports.email_verification_token_repository_port import (
    EmailVerificationTokenRepositoryPort,
)
from auth.infrastructure.mappers.account_mappers import ACCOUNT_ENTITIES
from auth.infrastructure.repositories.sqlalchemy_account_token_store import (
    SqlAlchemyAccountTokenStore,
)
from sqlalchemy import update


class SqlAlchemyEmailVerificationTokenRepository(
    SqlAlchemyAccountTokenStore, EmailVerificationTokenRepositoryPort
):
    purpose = AccountTokenPurpose.EMAIL_VERIFICATION

    def confirm_email(self, token: AccountToken, verified_at: int) -> bool:
        if not self._consume(token.token_hash):
            self.session.rollback()
            return False
        entity = ACCOUNT_ENTITIES[token.ref.account_type]
        # Conditional on the email: a concurrent email change wins over an old link.
        result = self.session.execute(
            update(entity)
            .where(entity.id == token.ref.account_id, entity.email == token.email)
            .values(email_verified_at=verified_at)
        )
        if result.rowcount != 1:
            self.session.rollback()
            return False
        self.session.execute(self._delete_for_account(token.ref))
        self.session.commit()
        return True
