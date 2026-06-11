from auth.application.use_cases.authorize_access import (
    AuthorizePenaAccessUseCase,
    AuthorizePlayerAccessUseCase,
)
from auth.domain.errors import AccessDeniedError, InvalidSessionTypeError
from auth.infrastructure.repositories.sqlalchemy_access_repository import (
    SqlAlchemyAccessRepository,
)
from auth.session import SessionData, get_session
from fastapi import Depends, Header, HTTPException, status
from persistence.module import get_db
from sqlalchemy.orm import Session


def _extract_token(authorization: str | None, x_session_token: str | None) -> str | None:
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            return parts[1]
    if x_session_token:
        return x_session_token
    return None


def get_current_session(
    authorization: str | None = Header(default=None),
    x_session_token: str | None = Header(default=None, alias="X-Session-Token"),
    db: Session = Depends(get_db),
) -> SessionData:
    token = _extract_token(authorization, x_session_token)
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
