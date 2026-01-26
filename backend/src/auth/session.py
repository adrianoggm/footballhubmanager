import os
import threading
import time
import uuid
from dataclasses import dataclass


@dataclass(frozen=True)
class SessionData:
    token: str
    user_id: int
    user_guid: str
    user_type: str
    expires_at: int


_LOCK = threading.Lock()
_SESSIONS: dict[str, SessionData] = {}
_DEFAULT_TTL_SECONDS = 60 * 60


def _now_ts() -> int:
    return int(time.time())


def _get_ttl_seconds() -> int:
    try:
        return int(os.getenv("SESSION_TTL_SECONDS", _DEFAULT_TTL_SECONDS))
    except ValueError:
        return _DEFAULT_TTL_SECONDS


def _cleanup_expired(now_ts: int | None = None) -> None:
    now_ts = now_ts or _now_ts()
    expired = [token for token, data in _SESSIONS.items() if data.expires_at <= now_ts]
    for token in expired:
        _SESSIONS.pop(token, None)


def create_session(*, user_id: int, user_guid: str, user_type: str) -> SessionData:
    ttl = _get_ttl_seconds()
    now_ts = _now_ts()
    expires_at = now_ts + ttl
    token = str(uuid.uuid4())
    data = SessionData(
        token=token,
        user_id=user_id,
        user_guid=user_guid,
        user_type=user_type,
        expires_at=expires_at,
    )
    with _LOCK:
        _cleanup_expired(now_ts)
        _SESSIONS[token] = data
    return data


def get_session(token: str) -> SessionData | None:
    now_ts = _now_ts()
    with _LOCK:
        data = _SESSIONS.get(token)
        if not data:
            return None
        if data.expires_at <= now_ts:
            _SESSIONS.pop(token, None)
            return None
        return data


def invalidate_session(token: str) -> None:
    with _LOCK:
        _SESSIONS.pop(token, None)
