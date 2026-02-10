import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth.dependencies import get_current_session
from auth.application.use_cases.login import (
    InvalidCredentialsError,
    LoginAdminUseCase,
    LoginPayload,
    LoginUserUseCase,
)
from auth.infrastructure.repositories.sqlalchemy_auth_account_repository import (
    SqlAlchemyAuthAccountRepository,
)
from auth.session import create_session, invalidate_session
from persistence.application.use_cases import (
    AdminRegistration,
    AdminUsernameExistsError,
    RegisterAdminUseCase,
    RegisterUserUseCase,
    UserRegistration,
    UserUsernameExistsError,
)
from persistence.infrastructure.repository.db.registration_repository import (
    SqlAlchemyRegistrationRepository,
)
from persistence.module import get_db

router = APIRouter()
logger = logging.getLogger(__name__)


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class LoginResponse(BaseModel):
    token: str
    token_type: str
    expires_at: int
    user_guid: str
    user_type: str


class RegisterUserRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)
    name: str = Field(min_length=1)
    surname1: str = Field(min_length=1)
    surname2: str | None = None
    nationality: str = Field(min_length=1)


class RegisterAdminRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)
    name: str = Field(min_length=1)


@router.post("/auth/login", response_model=LoginResponse)
def login_user(payload: LoginRequest, db: Session = Depends(get_db)):
    logger.info("User login attempt: %s", payload.username)
    repo = SqlAlchemyAuthAccountRepository(db)
    use_case = LoginUserUseCase(repo)
    try:
        user = use_case.execute(LoginPayload(username=payload.username, password=payload.password))
    except InvalidCredentialsError:
        logger.warning("User login failed: %s", payload.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    session = create_session(db, user_id=user.id, user_guid=user.guid, user_type="user")
    logger.info("User login ok: %s", user.guid)
    return LoginResponse(
        token=session.token,
        token_type="session",
        expires_at=session.expires_at,
        user_guid=session.user_guid,
        user_type=session.user_type,
    )


@router.post("/auth/admin/login", response_model=LoginResponse)
def login_admin(payload: LoginRequest, db: Session = Depends(get_db)):
    logger.info("Admin login attempt: %s", payload.username)
    repo = SqlAlchemyAuthAccountRepository(db)
    use_case = LoginAdminUseCase(repo)
    try:
        admin = use_case.execute(LoginPayload(username=payload.username, password=payload.password))
    except InvalidCredentialsError:
        logger.warning("Admin login failed: %s", payload.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    session = create_session(db, user_id=admin.id, user_guid=admin.guid, user_type="admin")
    logger.info("Admin login ok: %s", admin.guid)
    return LoginResponse(
        token=session.token,
        token_type="session",
        expires_at=session.expires_at,
        user_guid=session.user_guid,
        user_type=session.user_type,
    )


@router.post("/auth/register", response_model=LoginResponse)
def register_user(payload: RegisterUserRequest, db: Session = Depends(get_db)):
    logger.info("User register attempt: %s", payload.username)
    repository = SqlAlchemyRegistrationRepository(db)
    use_case = RegisterUserUseCase(repository)
    try:
        registered = use_case.execute(
            UserRegistration(
                username=payload.username,
                password=payload.password,
                name=payload.name,
                surname1=payload.surname1,
                surname2=payload.surname2,
                nationality=payload.nationality,
            )
        )
    except UserUsernameExistsError:
        logger.warning("User register exists: %s", payload.username)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

    session = create_session(
        db,
        user_id=registered.account_id,
        user_guid=registered.account_guid,
        user_type="user",
    )
    logger.info("User register ok: %s", registered.account_guid)
    return LoginResponse(
        token=session.token,
        token_type="session",
        expires_at=session.expires_at,
        user_guid=session.user_guid,
        user_type=session.user_type,
    )


@router.post("/auth/admin/register", response_model=LoginResponse)
def register_admin(payload: RegisterAdminRequest, db: Session = Depends(get_db)):
    logger.info("Admin register attempt: %s", payload.username)
    repository = SqlAlchemyRegistrationRepository(db)
    use_case = RegisterAdminUseCase(repository)
    try:
        registered = use_case.execute(
            AdminRegistration(
                username=payload.username,
                password=payload.password,
                name=payload.name,
            )
        )
    except AdminUsernameExistsError:
        logger.warning("Admin register exists: %s", payload.username)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

    session = create_session(
        db,
        user_id=registered.admin_id,
        user_guid=registered.admin_guid,
        user_type="admin",
    )
    logger.info("Admin register ok: %s", registered.admin_guid)
    return LoginResponse(
        token=session.token,
        token_type="session",
        expires_at=session.expires_at,
        user_guid=session.user_guid,
        user_type=session.user_type,
    )


@router.post("/auth/logout")
def logout(session=Depends(get_current_session), db: Session = Depends(get_db)):
    invalidate_session(db, session.token)
    return {"status": "ok"}
