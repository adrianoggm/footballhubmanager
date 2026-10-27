from __future__ import annotations

from auth.domain.errors import AccountEmailInUseError, AccountNotFoundError
from auth.domain.models.account_email import AccountEmail, AccountRef
from auth.domain.models.account_token import AccountTokenPurpose
from auth.domain.ports.account_email_repository_port import AccountEmailRepositoryPort
from auth.infrastructure.mappers.account_mappers import ACCOUNT_ENTITIES, AccountEmailMapper
from persistence.infrastructure.entity import AccountToken
from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session


class SqlAlchemyAccountEmailRepository(AccountEmailRepositoryPort):
    def __init__(self, session: Session):
        self.session = session

    def get_account_email(self, ref: AccountRef) -> AccountEmail | None:
        entity = ACCOUNT_ENTITIES[ref.account_type]
        row = self.session.execute(
            select(entity).where(entity.id == ref.account_id)
        ).scalar_one_or_none()
        if row is None:
            return None
        return AccountEmailMapper.to_domain(row, ref.account_type)

    def find_verified_by_email(self, email: str) -> list[AccountEmail]:
        accounts: list[AccountEmail] = []
        for account_type, entity in ACCOUNT_ENTITIES.items():
            row = self.session.execute(
                select(entity).where(entity.email == email, entity.email_verified_at.is_not(None))
            ).scalar_one_or_none()
            if row is not None:
                accounts.append(AccountEmailMapper.to_domain(row, account_type))
        return accounts

    def set_unverified_email(self, ref: AccountRef, email: str) -> None:
        entity = ACCOUNT_ENTITIES[ref.account_type]
        try:
            result = self.session.execute(
                update(entity)
                .where(entity.id == ref.account_id)
                .values(email=email, email_verified_at=None)
            )
            if result.rowcount == 0:
                self.session.rollback()
                raise AccountNotFoundError()
            # A reset link sent to the previous address must not outlive the change.
            self.session.execute(
                delete(AccountToken).where(
                    AccountToken.account_type == ref.account_type.value,
                    AccountToken.account_id == ref.account_id,
                    AccountToken.purpose == AccountTokenPurpose.PASSWORD_RESET.value,
                )
            )
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise AccountEmailInUseError() from exc
