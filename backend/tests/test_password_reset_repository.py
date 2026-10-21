from auth.domain.models.account_email import AccountRef, AccountType
from auth.domain.models.account_token import AccountToken, AccountTokenPurpose
from auth.infrastructure.repositories.sqlalchemy_password_reset_token_repository import (
    SqlAlchemyPasswordResetTokenRepository,
)
from auth.security import hash_account_token
from persistence.infrastructure.entity import (
    AccountToken as AccountTokenEntity,
)
from persistence.infrastructure.entity import (
    AdminAccounts,
    Base,
    PlayerAccount,
    UserSession,
)
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

USER_1 = AccountRef(account_type=AccountType.USER, account_id=1)


def _db_session() -> Session:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(
        engine,
        tables=[
            AdminAccounts.__table__,
            PlayerAccount.__table__,
            AccountTokenEntity.__table__,
            UserSession.__table__,
        ],
    )
    db = sessionmaker(autocommit=False, autoflush=False, bind=engine)()
    db.add(PlayerAccount(id=1, guid="user-1", username="ana", password="old-hash", name="Ana"))
    # Same numeric id in the other account table: must be left untouched.
    db.add(AdminAccounts(id=1, guid="admin-1", username="root", password="admin-hash", name="R"))
    for token, user_type in (("s-user-a", "user"), ("s-user-b", "user"), ("s-admin", "admin")):
        db.add(
            UserSession(
                token=token, user_id=1, user_guid="g", user_type=user_type, expires_at=9_999_999
            )
        )
    db.commit()
    return db


def _reset_token(raw: str, *, created_at: int = 1000) -> AccountToken:
    return AccountToken(
        token_hash=hash_account_token(raw),
        purpose=AccountTokenPurpose.PASSWORD_RESET,
        ref=USER_1,
        expires_at=created_at + 3600,
        created_at=created_at,
    )


def test_replace_token_invalidates_previous_reset_tokens_and_stores_hash_only():
    db = _db_session()
    repo = SqlAlchemyPasswordResetTokenRepository(db)
    repo.replace_token(_reset_token("first", created_at=1000))
    repo.replace_token(_reset_token("second", created_at=1100))

    assert repo.find(hash_account_token("first")) is None
    assert repo.find(hash_account_token("second")) is not None
    stored = list(db.execute(select(AccountTokenEntity.token_hash)).scalars())
    assert stored == [hash_account_token("second")]
    assert repo.last_issued_at(USER_1) == 1100


def test_reset_password_updates_hash_and_revokes_all_account_sessions():
    db = _db_session()
    repo = SqlAlchemyPasswordResetTokenRepository(db)
    token = _reset_token("reset-me")
    repo.replace_token(token)

    assert repo.reset_password(token, "new-hash") is True

    assert db.get(PlayerAccount, 1).password == "new-hash"
    assert db.get(AdminAccounts, 1).password == "admin-hash"
    remaining = set(db.execute(select(UserSession.token)).scalars())
    assert remaining == {"s-admin"}
    assert repo.find(token.token_hash) is None


def test_reset_password_is_single_use():
    db = _db_session()
    repo = SqlAlchemyPasswordResetTokenRepository(db)
    token = _reset_token("once")
    repo.replace_token(token)
    repo.reset_password(token, "new-hash")

    assert repo.reset_password(token, "another-hash") is False
    assert db.get(PlayerAccount, 1).password == "new-hash"


def test_find_ignores_verification_tokens():
    db = _db_session()
    db.add(
        AccountTokenEntity(
            token_hash=hash_account_token("verify"),
            purpose="EMAIL_VERIFICATION",
            account_type="user",
            account_id=1,
            email="ana@example.com",
            expires_at=9999,
            created_at=1,
        )
    )
    db.commit()

    assert SqlAlchemyPasswordResetTokenRepository(db).find(hash_account_token("verify")) is None
