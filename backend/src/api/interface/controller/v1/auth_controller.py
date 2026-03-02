import logging

from api.interface.controller.v1.model.request.auth_request import (
    LoginRequest,
    RegisterAdminRequest,
    RegisterUserRequest,
)
from api.interface.controller.v1.model.response.auth_response import LoginResponse
from auth.application.use_cases.login import (
    InvalidCredentialsError,
    LoginAdminUseCase,
    LoginPayload,
    LoginUserUseCase,
)
from auth.dependencies import get_current_session
from auth.infrastructure.repositories.sqlalchemy_auth_account_repository import (
    SqlAlchemyAuthAccountRepository,
)
from auth.session import create_session, invalidate_session
from fastapi import APIRouter, Depends, HTTPException, status
from persistence.application.use_cases import (
    AdminRegistration,
    AdminUsernameExistsError,
    InvalidAdminRegistrationDataError,
    InvalidRegistrationDataError,
    RegisterAdminUseCase,
    RegisterUserUseCase,
    UserInvalidNationalityError,
    UserRegistration,
    UserUsernameExistsError,
)
from persistence.infrastructure.repository.db.registration_repository import (
    SqlAlchemyRegistrationRepository,
)
from persistence.module import get_db
from sqlalchemy.orm import Session

router = APIRouter()
logger = logging.getLogger(__name__)


def get_login_user_use_case(db: Session = Depends(get_db)) -> LoginUserUseCase:
    repo = SqlAlchemyAuthAccountRepository(db)
    return LoginUserUseCase(repo)


def get_login_admin_use_case(db: Session = Depends(get_db)) -> LoginAdminUseCase:
    repo = SqlAlchemyAuthAccountRepository(db)
    return LoginAdminUseCase(repo)


def get_register_user_use_case(db: Session = Depends(get_db)) -> RegisterUserUseCase:
    repository = SqlAlchemyRegistrationRepository(db)
    return RegisterUserUseCase(repository)


def get_register_admin_use_case(db: Session = Depends(get_db)) -> RegisterAdminUseCase:
    repository = SqlAlchemyRegistrationRepository(db)
    return RegisterAdminUseCase(repository)


@router.post("/auth/login", response_model=LoginResponse)
def login_user(
    payload: LoginRequest,
    use_case: LoginUserUseCase = Depends(get_login_user_use_case),
    db: Session = Depends(get_db),
):
    logger.info("User login attempt")
    try:
        user = use_case.execute(LoginPayload(username=payload.username, password=payload.password))
    except InvalidCredentialsError:
        logger.warning("User login failed: invalid credentials")
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
def login_admin(
    payload: LoginRequest,
    use_case: LoginAdminUseCase = Depends(get_login_admin_use_case),
    db: Session = Depends(get_db),
):
    logger.info("Admin login attempt")
    try:
        admin = use_case.execute(LoginPayload(username=payload.username, password=payload.password))
    except InvalidCredentialsError:
        logger.warning("Admin login failed: invalid credentials")
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
def register_user(
    payload: RegisterUserRequest,
    use_case: RegisterUserUseCase = Depends(get_register_user_use_case),
    db: Session = Depends(get_db),
):
    logger.info("User register attempt: %s", payload.username)
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
    except InvalidRegistrationDataError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user registration data"
        )
    except UserInvalidNationalityError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid nationality")

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
def register_admin(
    payload: RegisterAdminRequest,
    use_case: RegisterAdminUseCase = Depends(get_register_admin_use_case),
    db: Session = Depends(get_db),
):
    logger.info("Admin register attempt: %s", payload.username)
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
    except InvalidAdminRegistrationDataError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid admin registration data"
        )

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
