import os
import time
import uuid
from dataclasses import dataclass

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from persistence.domain.entity import UserSession

@dataclass(frozen=True)
class SessionData:
    token: str
    user_id: int
    user_guid: str
    user_type: str
    expires_at: int


_DEFAULT_TTL_SECONDS = 60 * 60


def _now_ts() -> int:
    return int(time.time())


def _get_ttl_seconds() -> int:
    try:
        return int(os.getenv("SESSION_TTL_SECONDS", _DEFAULT_TTL_SECONDS))
    except ValueError:
        return _DEFAULT_TTL_SECONDS


def _cleanup_expired(db: Session, now_ts: int | None = None) -> None:
    now_ts = now_ts or _now_ts()
    db.execute(delete(UserSession).where(UserSession.expires_at <= now_ts))


def create_session(
    db: Session, *, user_id: int, user_guid: str, user_type: str
) -> SessionData:
    ttl = _get_ttl_seconds()
    now_ts = _now_ts()
    expires_at = now_ts + ttl
    token = str(uuid.uuid4())
    row = UserSession(
        token=token, user_id=user_id, user_guid=user_guid, user_type=user_type, expires_at=expires_at
    )
    _cleanup_expired(db, now_ts)
    db.add(row)
    db.commit()
    return SessionData(token=token, user_id=user_id, user_guid=user_guid, user_type=user_type, expires_at=expires_at)


def get_session(db: Session, token: str) -> SessionData | None:
    now_ts = _now_ts()
    with db.begin():
        row = (
            db.execute(
                select(UserSession)
                .where(UserSession.token == token)
                .with_for_update()
            )
            .scalar_one_or_none()
        )
        if not row:
            return None
        if row.expires_at <= now_ts:
            db.execute(delete(UserSession).where(UserSession.token == token))
            return None
        return SessionData(
            token=row.token,
            user_id=row.user_id,
            user_guid=row.user_guid,
            user_type=row.user_type,
            expires_at=row.expires_at,
        )


def invalidate_session(db: Session, token: str) -> None:
    db.execute(delete(UserSession).where(UserSession.token == token))
    db.commit()
