import time

from auth.session import create_session, get_session
from persistence.domain.entity.base import Base
from persistence.domain.entity.user_session import UserSession
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker


def _db_session() -> Session:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine, tables=[UserSession.__table__])
    local_session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return local_session()


def test_get_session_returns_none_when_token_not_found():
    db = _db_session()
    try:
        result = get_session(db, token="missing-token")
        assert result is None
    finally:
        db.close()


def test_get_session_returns_data_for_valid_session():
    now_ts = int(time.time())
    db = _db_session()
    try:
        db.add(
            UserSession(
                token="tok-1",
                user_id=7,
                user_guid="user-guid-7",
                user_type="user",
                expires_at=now_ts + 3600,
            )
        )
        db.commit()

        session = get_session(db, token="tok-1")

        assert session is not None
        assert session.token == "tok-1"
        assert session.user_id == 7
    finally:
        db.close()


def test_get_session_returns_none_and_deletes_expired_session():
    now_ts = int(time.time())
    db = _db_session()
    try:
        db.add(
            UserSession(
                token="tok-expired",
                user_id=9,
                user_guid="user-guid-9",
                user_type="user",
                expires_at=now_ts - 1,
            )
        )
        db.commit()

        result = get_session(db, token="tok-expired")

        assert result is None
        assert db.get(UserSession, "tok-expired") is None
    finally:
        db.close()


def test_create_session_cleans_expired_sessions_and_creates_new_session():
    now_ts = int(time.time())
    db = _db_session()
    try:
        db.add_all(
            [
                UserSession(
                    token="tok-expired",
                    user_id=1,
                    user_guid="expired-guid",
                    user_type="user",
                    expires_at=now_ts - 10,
                ),
                UserSession(
                    token="tok-valid",
                    user_id=2,
                    user_guid="valid-guid",
                    user_type="admin",
                    expires_at=now_ts + 3600,
                ),
            ]
        )
        db.commit()

        created = create_session(db, user_id=9, user_guid="new-guid", user_type="user")

        assert db.get(UserSession, "tok-expired") is None
        assert db.get(UserSession, "tok-valid") is not None
        persisted = db.get(UserSession, created.token)
        assert persisted is not None
        assert persisted.user_id == 9
    finally:
        db.close()


def test_create_session_handles_already_open_transaction():
    db = _db_session()
    try:
        db.execute(select(UserSession).where(UserSession.token == "missing")).all()
        assert db.in_transaction()

        created = create_session(db, user_id=5, user_guid="guid-5", user_type="admin")

        persisted = db.get(UserSession, created.token)
        assert persisted is not None
        assert persisted.user_guid == "guid-5"
    finally:
        db.close()
