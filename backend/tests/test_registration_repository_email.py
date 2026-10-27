import pytest
from auth.domain.errors import AccountEmailInUseError
from core.domain.errors import AdminUsernameExistsError, UserUsernameExistsError
from persistence.infrastructure.entity import (
    AdminAccounts,
    Base,
    Pena,
    PenaRole,
    Player,
    PlayerAccount,
)
from persistence.infrastructure.repository.db import registration_repository
from persistence.infrastructure.repository.db.registration_repository import (
    SqlAlchemyRegistrationRepository,
)
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker


def _db_session() -> Session:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(
        engine,
        tables=[
            AdminAccounts.__table__,
            PlayerAccount.__table__,
            Pena.__table__,
            PenaRole.__table__,
            Player.__table__,
        ],
    )
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)()


def _register_user(repo, *, username: str, email: str):
    return repo.register_user(
        username=username,
        password_hash="hash",
        name="Ana",
        surname1="Lopez",
        surname2=None,
        nationality="Spain",
        email=email,
    )


def test_register_user_stores_email_unverified():
    db = _db_session()
    repo = SqlAlchemyRegistrationRepository(db)

    result = _register_user(repo, username="ana", email="ana@example.com")
    db.commit()

    account = db.get(PlayerAccount, result.account_id)
    assert account.email == "ana@example.com"
    assert account.email_verified_at is None


def test_register_user_duplicate_email_maps_to_email_in_use():
    db = _db_session()
    repo = SqlAlchemyRegistrationRepository(db)
    _register_user(repo, username="ana", email="ana@example.com")
    db.commit()

    with pytest.raises(AccountEmailInUseError):
        _register_user(repo, username="ana2", email="ana@example.com")


def test_register_user_duplicate_username_still_maps_to_username_exists():
    db = _db_session()
    repo = SqlAlchemyRegistrationRepository(db)
    _register_user(repo, username="email", email="first@example.com")
    db.commit()

    with pytest.raises(UserUsernameExistsError):
        _register_user(repo, username="email", email="second@example.com")


def test_register_admin_duplicate_email_maps_to_email_in_use():
    db = _db_session()
    repo = SqlAlchemyRegistrationRepository(db)
    repo.register_admin(username="root", password_hash="h", name="Root", email="r@example.com")
    db.commit()

    with pytest.raises(AccountEmailInUseError):
        repo.register_admin(username="root2", password_hash="h", name="R2", email="r@example.com")


def test_register_admin_duplicate_username():
    db = _db_session()
    repo = SqlAlchemyRegistrationRepository(db)
    repo.register_admin(username="root", password_hash="h", name="Root", email="r@example.com")
    db.commit()

    with pytest.raises(AdminUsernameExistsError):
        repo.register_admin(username="root", password_hash="h", name="R2", email="x@example.com")


@pytest.mark.parametrize(
    ("message", "expected"),
    [
        (
            "(1062, \"Duplicate entry 'a@b.co' for key 'player_account.uq_player_account_email'\")",
            True,
        ),
        (
            "(1062, \"Duplicate entry 'my_email' for key "
            "'player_account.uq_player_account_username'\")",
            False,
        ),
        ("UNIQUE constraint failed: admin_accounts.email", True),
        ("UNIQUE constraint failed: admin_accounts.username", False),
        ("something else", False),
    ],
)
def test_is_email_conflict_inspects_only_the_violated_key(message, expected):
    class _Exc:
        orig = message

    assert registration_repository._is_email_conflict(_Exc()) is expected
