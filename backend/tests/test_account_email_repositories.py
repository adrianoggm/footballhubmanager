import pytest
from auth.domain.errors import AccountEmailInUseError, AccountNotFoundError
from auth.domain.models.account_email import AccountRef, AccountType
from auth.domain.models.account_token import AccountToken, AccountTokenPurpose
from auth.infrastructure.repositories.sqlalchemy_account_email_repository import (
    SqlAlchemyAccountEmailRepository,
)
from auth.infrastructure.repositories.sqlalchemy_email_verification_token_repository import (
    SqlAlchemyEmailVerificationTokenRepository,
)
from auth.security import hash_account_token
from persistence.infrastructure.entity import (
    AccountToken as AccountTokenEntity,
)
from persistence.infrastructure.entity import (
    AdminAccounts,
    Base,
    PlayerAccount,
)
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

USER_1 = AccountRef(account_type=AccountType.USER, account_id=1)
ADMIN_1 = AccountRef(account_type=AccountType.ADMIN, account_id=1)


def _db_session() -> Session:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(
        engine,
        tables=[AdminAccounts.__table__, PlayerAccount.__table__, AccountTokenEntity.__table__],
    )
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)()


def _seed(db: Session) -> None:
    db.add(
        PlayerAccount(
            id=1,
            guid="user-1",
            username="ana",
            password="p",
            name="Ana",
            email="shared@example.com",
            email_verified_at=100,
        )
    )
    db.add(PlayerAccount(id=2, guid="user-2", username="bob", password="p", name="Bob"))
    db.add(
        AdminAccounts(
            id=1,
            guid="admin-1",
            username="root",
            password="p",
            name="Root",
            email="shared@example.com",
            email_verified_at=200,
        )
    )
    db.add(
        AdminAccounts(
            id=2,
            guid="admin-2",
            username="pending",
            password="p",
            name="Pending",
            email="pending@example.com",
        )
    )
    db.commit()


def _token(
    raw: str,
    *,
    ref: AccountRef = USER_1,
    purpose: AccountTokenPurpose = AccountTokenPurpose.EMAIL_VERIFICATION,
    email: str | None = "shared@example.com",
    created_at: int = 1000,
    expires_at: int = 5000,
) -> AccountToken:
    return AccountToken(
        token_hash=hash_account_token(raw),
        purpose=purpose,
        ref=ref,
        email=email,
        expires_at=expires_at,
        created_at=created_at,
    )


def test_get_account_email_maps_both_account_types():
    db = _db_session()
    _seed(db)
    repo = SqlAlchemyAccountEmailRepository(db)

    user = repo.get_account_email(USER_1)
    admin = repo.get_account_email(AccountRef(AccountType.ADMIN, 2))

    assert user.guid == "user-1" and user.is_verified
    assert admin.username == "pending" and admin.email == "pending@example.com"
    assert not admin.is_verified
    assert repo.get_account_email(AccountRef(AccountType.USER, 99)) is None


def test_find_verified_by_email_returns_one_account_per_table_and_skips_unverified():
    db = _db_session()
    _seed(db)
    repo = SqlAlchemyAccountEmailRepository(db)

    found = repo.find_verified_by_email("shared@example.com")

    assert {account.ref for account in found} == {USER_1, ADMIN_1}
    assert repo.find_verified_by_email("pending@example.com") == []
    assert repo.find_verified_by_email("nobody@example.com") == []


def test_set_unverified_email_resets_verification_and_drops_reset_tokens():
    db = _db_session()
    _seed(db)
    tokens = SqlAlchemyEmailVerificationTokenRepository(db)
    db.add(
        AccountTokenEntity(
            token_hash="r" * 64,
            purpose="PASSWORD_RESET",
            account_type="user",
            account_id=1,
            email=None,
            expires_at=9999,
            created_at=1,
        )
    )
    db.commit()
    tokens.replace_token(_token("verify-token-1"))

    SqlAlchemyAccountEmailRepository(db).set_unverified_email(USER_1, "new@example.com")

    row = db.get(PlayerAccount, 1)
    assert row.email == "new@example.com"
    assert row.email_verified_at is None
    purposes = set(db.execute(select(AccountTokenEntity.purpose)).scalars())
    assert purposes == {"EMAIL_VERIFICATION"}


def test_set_unverified_email_rejects_email_taken_in_same_table():
    db = _db_session()
    _seed(db)

    with pytest.raises(AccountEmailInUseError):
        SqlAlchemyAccountEmailRepository(db).set_unverified_email(
            AccountRef(AccountType.USER, 2), "shared@example.com"
        )
    assert db.get(PlayerAccount, 2).email is None


def test_same_email_is_allowed_across_account_tables():
    db = _db_session()
    _seed(db)

    SqlAlchemyAccountEmailRepository(db).set_unverified_email(
        AccountRef(AccountType.ADMIN, 2), "bob-and-admin@example.com"
    )
    SqlAlchemyAccountEmailRepository(db).set_unverified_email(
        AccountRef(AccountType.USER, 2), "bob-and-admin@example.com"
    )

    assert db.get(PlayerAccount, 2).email == "bob-and-admin@example.com"


def test_set_unverified_email_unknown_account():
    db = _db_session()
    _seed(db)

    with pytest.raises(AccountNotFoundError):
        SqlAlchemyAccountEmailRepository(db).set_unverified_email(
            AccountRef(AccountType.USER, 99), "x@example.com"
        )


def test_replace_token_stores_only_hash_and_replaces_previous_and_expired():
    db = _db_session()
    _seed(db)
    tokens = SqlAlchemyEmailVerificationTokenRepository(db)
    # Expired token of another account is housekept on the next issue.
    tokens.replace_token(_token("other-old", ref=ADMIN_1, created_at=10, expires_at=20))
    tokens.replace_token(_token("first-token", created_at=1000))
    tokens.replace_token(_token("second-token", created_at=1100))

    stored = list(db.execute(select(AccountTokenEntity.token_hash)).scalars())
    assert stored == [hash_account_token("second-token")]
    assert "second-token" not in stored
    assert len(stored[0]) == 64
    assert tokens.last_issued_at(USER_1) == 1100
    assert tokens.last_issued_at(ADMIN_1) is None


def test_find_is_scoped_to_purpose():
    db = _db_session()
    _seed(db)
    tokens = SqlAlchemyEmailVerificationTokenRepository(db)
    db.add(
        AccountTokenEntity(
            token_hash=hash_account_token("reset-token"),
            purpose="PASSWORD_RESET",
            account_type="user",
            account_id=1,
            email=None,
            expires_at=9999,
            created_at=1,
        )
    )
    db.commit()

    assert tokens.find(hash_account_token("reset-token")) is None


def test_confirm_email_marks_verified_and_is_single_use():
    db = _db_session()
    _seed(db)
    ref = AccountRef(AccountType.ADMIN, 2)
    tokens = SqlAlchemyEmailVerificationTokenRepository(db)
    token = _token("verify-admin", ref=ref, email="pending@example.com")
    tokens.replace_token(token)

    found = tokens.find(token.token_hash)
    assert found == token

    assert tokens.confirm_email(found, verified_at=4242) is True
    assert db.get(AdminAccounts, 2).email_verified_at == 4242
    assert tokens.find(token.token_hash) is None
    assert tokens.confirm_email(found, verified_at=5000) is False
    assert db.get(AdminAccounts, 2).email_verified_at == 4242


def test_confirm_email_refuses_when_account_email_changed():
    db = _db_session()
    _seed(db)
    ref = AccountRef(AccountType.ADMIN, 2)
    tokens = SqlAlchemyEmailVerificationTokenRepository(db)
    token = _token("verify-old", ref=ref, email="old@example.com")
    tokens.replace_token(token)

    assert tokens.confirm_email(token, verified_at=4242) is False
    assert db.get(AdminAccounts, 2).email_verified_at is None
    # Rolled back: the token is still there for the handler to discard.
    assert tokens.find(token.token_hash) is not None


def test_discard_deletes_token():
    db = _db_session()
    _seed(db)
    tokens = SqlAlchemyEmailVerificationTokenRepository(db)
    token = _token("to-discard")
    tokens.replace_token(token)

    tokens.discard(token.token_hash)

    assert tokens.find(token.token_hash) is None
