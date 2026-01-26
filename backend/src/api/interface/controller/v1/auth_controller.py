from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_session
from auth.security import verify_password
from auth.session import create_session, invalidate_session
from persistence.domain.entity import AdminAccounts, PlayerAccount
from persistence.module import get_db

router = APIRouter()


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class LoginResponse(BaseModel):
    token: str
    token_type: str
    expires_at: int
    user_guid: str
    user_type: str


@router.post("/auth/login", response_model=LoginResponse)
def login_user(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.execute(
        select(PlayerAccount).where(PlayerAccount.username == payload.username)
    ).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    session = create_session(user_id=user.id, user_guid=user.guid, user_type="user")
    return LoginResponse(
        token=session.token,
        token_type="session",
        expires_at=session.expires_at,
        user_guid=session.user_guid,
        user_type=session.user_type,
    )


@router.post("/auth/admin/login", response_model=LoginResponse)
def login_admin(payload: LoginRequest, db: Session = Depends(get_db)):
    admin = db.execute(
        select(AdminAccounts).where(AdminAccounts.username == payload.username)
    ).scalar_one_or_none()
    if not admin or not verify_password(payload.password, admin.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    session = create_session(user_id=admin.id, user_guid=admin.guid, user_type="admin")
    return LoginResponse(
        token=session.token,
        token_type="session",
        expires_at=session.expires_at,
        user_guid=session.user_guid,
        user_type=session.user_type,
    )


@router.post("/auth/logout")
def logout(session=Depends(get_current_session)):
    invalidate_session(session.token)
    return {"status": "ok"}
