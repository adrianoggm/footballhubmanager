from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.session import SessionData, get_session
from persistence.domain.entity import Pena, PenaPlayer, Player
from persistence.module import get_db


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


def authorize_pena_access(
    pena_guid: str,
    session: SessionData = Depends(get_current_session),
    db: Session = Depends(get_db),
) -> SessionData:
    if session.user_type == "admin":
        owns_pena = db.execute(
            select(Pena.id).where(Pena.guid == pena_guid, Pena.id_admin == session.user_id)
        ).first()
        if owns_pena:
            return session
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin does not manage this pena",
        )

    if session.user_type == "user":
        membership = db.execute(
            select(Pena.id)
            .join(PenaPlayer, PenaPlayer.id_pena == Pena.id)
            .join(Player, Player.id == PenaPlayer.id_player)
            .where(Pena.guid == pena_guid, Player.id_player_account == session.user_id)
        ).first()
        if membership:
            return session
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not belong to this pena",
        )

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Invalid session type",
    )


def authorize_player_access(
    player_guid: str,
    session: SessionData = Depends(get_current_session),
    db: Session = Depends(get_db),
) -> SessionData:
    if session.user_type == "user":
        own_player = db.execute(
            select(Player.id).where(
                Player.guid == player_guid,
                Player.id_player_account == session.user_id,
            )
        ).first()
        if own_player:
            return session
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User cannot access this player",
        )

    if session.user_type == "admin":
        managed = db.execute(
            select(Player.id)
            .join(PenaPlayer, PenaPlayer.id_player == Player.id)
            .join(Pena, Pena.id == PenaPlayer.id_pena)
            .where(Player.guid == player_guid, Pena.id_admin == session.user_id)
        ).first()
        if managed:
            return session
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin cannot access this player",
        )

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Invalid session type",
    )
