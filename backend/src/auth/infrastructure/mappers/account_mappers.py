"""Mappers between account ORM rows and the auth domain models."""

from __future__ import annotations

from auth.domain.models.account_email import AccountEmail, AccountRef, AccountType
from auth.domain.models.account_token import AccountToken, AccountTokenPurpose
from persistence.infrastructure.entity import AccountToken as AccountTokenEntity
from persistence.infrastructure.entity import AdminAccounts, PlayerAccount

AccountEntity = type[PlayerAccount] | type[AdminAccounts]

# One table per account type; an id is only meaningful together with its type.
ACCOUNT_ENTITIES: dict[AccountType, AccountEntity] = {
    AccountType.USER: PlayerAccount,
    AccountType.ADMIN: AdminAccounts,
}


class AccountEmailMapper:
    @staticmethod
    def to_domain(row: PlayerAccount | AdminAccounts, account_type: AccountType) -> AccountEmail:
        return AccountEmail(
            ref=AccountRef(account_type=account_type, account_id=row.id),
            guid=row.guid,
            username=row.username,
            email=row.email,
            email_verified_at=row.email_verified_at,
        )


class AccountTokenMapper:
    @staticmethod
    def to_domain(row: AccountTokenEntity) -> AccountToken:
        return AccountToken(
            token_hash=row.token_hash,
            purpose=AccountTokenPurpose(row.purpose),
            ref=AccountRef(account_type=AccountType(row.account_type), account_id=row.account_id),
            email=row.email,
            expires_at=row.expires_at,
            created_at=row.created_at,
        )

    @staticmethod
    def to_entity(token: AccountToken) -> AccountTokenEntity:
        return AccountTokenEntity(
            token_hash=token.token_hash,
            purpose=token.purpose.value,
            account_type=token.ref.account_type.value,
            account_id=token.ref.account_id,
            email=token.email,
            expires_at=token.expires_at,
            created_at=token.created_at,
        )
