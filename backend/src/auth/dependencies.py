import os

from auth.application.use_cases.authorize_access import (
    AuthorizePenaAccessUseCase,
    AuthorizePlayerAccessUseCase,
)
from auth.domain.errors import AccessDeniedError, InvalidSessionTypeError
from auth.infrastructure.repositories.sqlalchemy_access_repository import (
    SqlAlchemyAccessRepository,
)
from auth.session import SessionData, get_session
from fastapi import Cookie, Depends, Header, HTTPException, Response, status
from persistence.module import get_db
from sqlalchemy.orm import Session

SESSION_COOKIE_NAME = "session"


def _cookie_secure() -> bool:
    """Set the Secure flag outside dev/test (HTTPS-only in production)."""
    env = os.getenv("APP_ENV", "production").strip().lower()
    return env not in {"dev", "development", "local", "test"}


def set_session_cookie(response: Response, session: SessionData) -> None:
    """Store the session token in an HttpOnly cookie (kept out of JS / localStorage)."""
    import time

    max_age = max(0, session.expires_at - int(time.time()))
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session.token,
        max_age=max_age,
        httponly=True,
        secure=_cookie_secure(),
        samesite="strict",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=_cookie_secure(),
        samesite="strict",
    )


def _extract_token(
    authorization: str | None,
    x_session_token: str | None,
    session_cookie: str | None = None,
) -> str | None:
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            return parts[1]
    if x_session_token:
        return x_session_token
    if session_cookie:
        return session_cookie
    return None


def get_current_session(
    authorization: str | None = Header(default=None),
    x_session_token: str | None = Header(default=None, alias="X-Session-Token"),
    session_cookie: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    db: Session = Depends(get_db),
) -> SessionData:
    token = _extract_token(authorization, x_session_token, session_cookie)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing session token",
        )
    session = get_session(db, token)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )
    return session


def require_admin(session: SessionData = Depends(get_current_session)) -> SessionData:
    if session.user_type != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return session


def require_user(session: SessionData = Depends(get_current_session)) -> SessionData:
    if session.user_type != "user":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User access required",
        )
    return session


def authorize_pena_access(
    pena_guid: str,
    session: SessionData = Depends(get_current_session),
    db: Session = Depends(get_db),
) -> SessionData:
    repository = SqlAlchemyAccessRepository(db)
    use_case = AuthorizePenaAccessUseCase(repository)
    try:
        use_case.execute(pena_guid=pena_guid, session=session)
        return session
    except AccessDeniedError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        )
    except InvalidSessionTypeError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid session type",
        )


def authorize_player_access(
    player_guid: str,
    session: SessionData = Depends(get_current_session),
    db: Session = Depends(get_db),
) -> SessionData:
    repository = SqlAlchemyAccessRepository(db)
    use_case = AuthorizePlayerAccessUseCase(repository)
    try:
        use_case.execute(player_guid=player_guid, session=session)
        return session
    except AccessDeniedError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        )
    except InvalidSessionTypeError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid session type",
        )
