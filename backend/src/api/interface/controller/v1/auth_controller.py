import logging

from api.dependencies.use_cases import (
    get_login_admin_use_case,
    get_login_user_use_case,
    get_register_admin_use_case,
    get_register_user_use_case,
)
from api.interface.controller.v1.model.request.auth_request import (
    LoginRequest,
    RegisterAdminRequest,
    RegisterUserRequest,
)
from api.interface.controller.v1.model.response.auth_response import LoginResponse
from api.middleware.exception_mapper import map_exceptions
from auth.application.use_cases.login import (
    LoginAdminUseCase,
    LoginPayload,
    LoginUserUseCase,
)
from auth.dependencies import get_current_session
from auth.session import create_session, invalidate_session
from fastapi import APIRouter, Depends
from persistence.application.use_cases import (
    AdminRegistration,
    RegisterAdminUseCase,
    RegisterUserUseCase,
    UserRegistration,
)
from persistence.module import get_db
from sqlalchemy.orm import Session

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/auth/login", response_model=LoginResponse)
@map_exceptions
def login_user(
    payload: LoginRequest,
    use_case: LoginUserUseCase = Depends(get_login_user_use_case),
    db: Session = Depends(get_db),
):
    logger.info("User login attempt")
    user = use_case.execute(LoginPayload(username=payload.username, password=payload.password))
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
@map_exceptions
def login_admin(
    payload: LoginRequest,
    use_case: LoginAdminUseCase = Depends(get_login_admin_use_case),
    db: Session = Depends(get_db),
):
    logger.info("Admin login attempt")
    admin = use_case.execute(LoginPayload(username=payload.username, password=payload.password))
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
@map_exceptions
def register_user(
    payload: RegisterUserRequest,
    use_case: RegisterUserUseCase = Depends(get_register_user_use_case),
    db: Session = Depends(get_db),
):
    logger.info("User register attempt: %s", payload.username)
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
    try:
        session = create_session(
            db,
            user_id=registered.account_id,
            user_guid=registered.account_guid,
            user_type="user",
        )
    except Exception:
        db.rollback()
        raise
    logger.info("User register ok: %s", registered.account_guid)
    return LoginResponse(
        token=session.token,
        token_type="session",
        expires_at=session.expires_at,
        user_guid=session.user_guid,
        user_type=session.user_type,
    )


@router.post("/auth/admin/register", response_model=LoginResponse)
@map_exceptions
def register_admin(
    payload: RegisterAdminRequest,
    use_case: RegisterAdminUseCase = Depends(get_register_admin_use_case),
    db: Session = Depends(get_db),
):
    logger.info("Admin register attempt: %s", payload.username)
    registered = use_case.execute(
        AdminRegistration(
            username=payload.username,
            password=payload.password,
            name=payload.name,
        )
    )
    try:
        session = create_session(
            db,
            user_id=registered.admin_id,
            user_guid=registered.admin_guid,
            user_type="admin",
        )
    except Exception:
        db.rollback()
        raise
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
