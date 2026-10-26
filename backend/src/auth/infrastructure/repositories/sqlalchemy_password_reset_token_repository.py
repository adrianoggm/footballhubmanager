from __future__ import annotations

from auth.domain.models.account_token import AccountToken, AccountTokenPurpose
from auth.domain.ports.password_reset_token_repository_port import (
    PasswordResetTokenRepositoryPort,
)
from auth.infrastructure.mappers.account_mappers import ACCOUNT_ENTITIES
from auth.infrastructure.repositories.sqlalchemy_account_token_store import (
    SqlAlchemyAccountTokenStore,
)
from persistence.infrastructure.entity import UserSession
from sqlalchemy import delete, update


class SqlAlchemyPasswordResetTokenRepository(
    SqlAlchemyAccountTokenStore, PasswordResetTokenRepositoryPort
):
    purpose = AccountTokenPurpose.PASSWORD_RESET

    def reset_password(self, token: AccountToken, password_hash: str) -> bool:
        if not self._consume(token.token_hash):
            self.session.rollback()
            return False
        entity = ACCOUNT_ENTITIES[token.ref.account_type]
        result = self.session.execute(
            update(entity).where(entity.id == token.ref.account_id).values(password=password_hash)
        )
        if result.rowcount != 1:
            self.session.rollback()
            return False
        self.session.execute(self._delete_for_account(token.ref))
        self.session.execute(
            delete(UserSession).where(
                UserSession.user_id == token.ref.account_id,
                UserSession.user_type == token.ref.account_type.value,
            )
        )
        self.session.commit()
        return True
