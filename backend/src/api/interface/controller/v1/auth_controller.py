import logging

from api.dependencies.use_cases import (
    get_account_email_command_bus,
    get_account_email_query_bus,
    get_login_admin_use_case,
    get_login_user_use_case,
    get_registration_command_bus,
)
from api.interface.controller.v1.model.request.auth_request import (
    ChangeAccountEmailRequest,
    LoginRequest,
    RegisterAdminRequest,
    RegisterUserRequest,
    ResendEmailVerificationRequest,
    VerifyEmailRequest,
)
from api.interface.controller.v1.model.response.auth_response import (
    AccountEmailResponse,
    AuthStatusResponse,
    LoginResponse,
    SessionResponse,
)
from api.middleware.exception_mapper import map_exceptions
from auth.application.commands.account_email_commands import (
    ChangeAccountEmailCommand,
    ResendEmailVerificationCommand,
    SendRegistrationEmailVerificationCommand,
    VerifyEmailCommand,
)
from auth.application.queries.account_email_queries import (
    AccountEmailStatusResult,
    GetAccountEmailQuery,
)
from auth.application.use_cases.login import (
    InvalidCredentialsError,
    LoginAdminUseCase,
    LoginPayload,
    LoginUserUseCase,
)
from auth.dependencies import (
    clear_session_cookie,
    get_current_session,
    set_session_cookie,
)
from auth.domain.models.account_email import AccountRef, AccountType
from auth.domain.models.mail_language import MailLanguage
from auth.session import SessionData, create_session, invalidate_session
from core.application.commands.registration_commands import (
    RegisterAdminCommand,
    RegisterUserCommand,
)
from fastapi import APIRouter, Depends, Response, status
from persistence.module import get_db
from shared.application.bus.buses import CommandBus, QueryBus
from sqlalchemy.orm import Session

router = APIRouter()
logger = logging.getLogger(__name__)


def _account_ref(session: SessionData) -> AccountRef:
    return AccountRef(account_type=AccountType(session.user_type), account_id=session.user_id)


def _account_email_response(result: AccountEmailStatusResult) -> AccountEmailResponse:
    return AccountEmailResponse(email=result.email, email_verified=result.email_verified)


@router.post("/auth/login", response_model=LoginResponse)
@map_exceptions
def login_user(
    payload: LoginRequest,
    response: Response,
    use_case: LoginUserUseCase = Depends(get_login_user_use_case),
    db: Session = Depends(get_db),
):
    logger.info("User login attempt")
    try:
        user = use_case.execute(LoginPayload(username=payload.username, password=payload.password))
    except InvalidCredentialsError:
        logger.warning("User login failed: invalid credentials")
        raise
    session = create_session(db, user_id=user.id, user_guid=user.guid, user_type="user")
    set_session_cookie(response, session)
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
    response: Response,
    use_case: LoginAdminUseCase = Depends(get_login_admin_use_case),
    db: Session = Depends(get_db),
):
    logger.info("Admin login attempt")
    try:
        admin = use_case.execute(LoginPayload(username=payload.username, password=payload.password))
    except InvalidCredentialsError:
        logger.warning("Admin login failed: invalid credentials")
        raise
    session = create_session(db, user_id=admin.id, user_guid=admin.guid, user_type="admin")
    set_session_cookie(response, session)
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
    response: Response,
    command_bus: CommandBus = Depends(get_registration_command_bus),
    db: Session = Depends(get_db),
):
    logger.info("User register attempt: %s", payload.username)
    registered = command_bus.dispatch(
        RegisterUserCommand(
            username=payload.username,
            password=payload.password,
            name=payload.name,
            surname1=payload.surname1,
            surname2=payload.surname2,
            nationality=payload.nationality,
            email=payload.email,
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
    set_session_cookie(response, session)
    command_bus.dispatch(
        SendRegistrationEmailVerificationCommand(
            ref=AccountRef(account_type=AccountType.USER, account_id=registered.account_id),
            lang=MailLanguage(payload.lang),
        )
    )
    logger.info("User register ok: %s", registered.account_guid)
    return LoginResponse(
        token=session.token,
        token_type="session",
        expires_at=session.expires_at,
        user_guid=session.user_guid,
        user_type=session.user_type,
    )


@router.post(
    "/auth/admin/register",
    response_model=LoginResponse,
)
@map_exceptions
def register_admin(
    payload: RegisterAdminRequest,
    response: Response,
    command_bus: CommandBus = Depends(get_registration_command_bus),
    db: Session = Depends(get_db),
):
    logger.info("Admin register attempt: %s", payload.username)
    registered = command_bus.dispatch(
        RegisterAdminCommand(
            username=payload.username,
            password=payload.password,
            name=payload.name,
            email=payload.email,
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
    set_session_cookie(response, session)
    command_bus.dispatch(
        SendRegistrationEmailVerificationCommand(
            ref=AccountRef(account_type=AccountType.ADMIN, account_id=registered.admin_id),
            lang=MailLanguage(payload.lang),
        )
    )
    logger.info("Admin register ok: %s", registered.admin_guid)
    return LoginResponse(
        token=session.token,
        token_type="session",
        expires_at=session.expires_at,
        user_guid=session.user_guid,
        user_type=session.user_type,
    )


@router.get("/auth/session", response_model=SessionResponse)
@map_exceptions
def read_session(
    session=Depends(get_current_session),
    query_bus: QueryBus = Depends(get_account_email_query_bus),
):
    """Restore session metadata from the cookie (used by the SPA on reload)."""
    email_status = query_bus.ask(GetAccountEmailQuery(ref=_account_ref(session)))
    return SessionResponse(
        expires_at=session.expires_at,
        user_guid=session.user_guid,
        user_type=session.user_type,
        email=email_status.email,
        email_verified=email_status.email_verified,
    )


@router.get("/auth/me/email", response_model=AccountEmailResponse)
@map_exceptions
def read_account_email(
    session: SessionData = Depends(get_current_session),
    query_bus: QueryBus = Depends(get_account_email_query_bus),
):
    return _account_email_response(query_bus.ask(GetAccountEmailQuery(ref=_account_ref(session))))


@router.put("/auth/me/email", response_model=AccountEmailResponse)
@map_exceptions
def change_account_email(
    payload: ChangeAccountEmailRequest,
    session: SessionData = Depends(get_current_session),
    command_bus: CommandBus = Depends(get_account_email_command_bus),
):
    result = command_bus.dispatch(
        ChangeAccountEmailCommand(
            ref=_account_ref(session), email=payload.email, lang=MailLanguage(payload.lang)
        )
    )
    return _account_email_response(result)


@router.post(
    "/auth/me/email/verification",
    response_model=AuthStatusResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
@map_exceptions
def resend_email_verification(
    payload: ResendEmailVerificationRequest,
    session: SessionData = Depends(get_current_session),
    command_bus: CommandBus = Depends(get_account_email_command_bus),
):
    command_bus.dispatch(
        ResendEmailVerificationCommand(ref=_account_ref(session), lang=MailLanguage(payload.lang))
    )
    return AuthStatusResponse(status="sent")


@router.post("/auth/email/verify", response_model=AuthStatusResponse)
@map_exceptions
def verify_email(
    payload: VerifyEmailRequest,
    command_bus: CommandBus = Depends(get_account_email_command_bus),
):
    command_bus.dispatch(VerifyEmailCommand(token=payload.token))
    return AuthStatusResponse(status="verified")


@router.post("/auth/logout")
def logout(
    response: Response,
    session=Depends(get_current_session),
    db: Session = Depends(get_db),
):
    invalidate_session(db, session.token)
    clear_session_cookie(response)
    return {"status": "ok"}
