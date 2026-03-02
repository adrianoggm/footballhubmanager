import math
from dataclasses import asdict

from app.config import config as app_config
from api.interface.controller.v1.model.request.penas_request import ConsumeLinkTokenRequest
from api.interface.controller.v1.model.response.penas_response import (
    LinkTokenResponse,
    PenaResponse,
    PenasPageResponse,
)
from auth.dependencies import authorize_pena_access, get_current_session, require_admin
from fastapi import APIRouter, Depends, HTTPException, Query, status
from persistence.application.use_cases import (
    GeneratePenaLinkTokenUseCase,
    GetPenasUseCase,
    InvalidLinkTokenError,
    LinkUserToPenaUseCase,
    PenaAccessDeniedError,
    PenasPage,
    UserAlreadyLinkedError,
    UserProfileNotFoundError,
)
from persistence.infrastructure.repository.db.pena_link_repository import (
    SqlAlchemyPenaLinkRepository,
)
from persistence.infrastructure.repository.db.pena_query_repository import (
    SqlAlchemyPenaQueryRepository,
)
from persistence.module import get_db
from sqlalchemy.orm import Session

router = APIRouter()


def get_penas_use_case(db: Session = Depends(get_db)) -> GetPenasUseCase:
    repository = SqlAlchemyPenaQueryRepository(db)
    return GetPenasUseCase(repository)


def get_generate_pena_link_token_use_case(
    db: Session = Depends(get_db),
) -> GeneratePenaLinkTokenUseCase:
    repository = SqlAlchemyPenaLinkRepository(db)
    return GeneratePenaLinkTokenUseCase(repository)


def get_link_user_to_pena_use_case(db: Session = Depends(get_db)) -> LinkUserToPenaUseCase:
    repository = SqlAlchemyPenaLinkRepository(db)
    return LinkUserToPenaUseCase(repository)


def _page_response(page: PenasPage) -> PenasPageResponse:
    total_pages = math.ceil(page.total / page.page_size) if page.total else 0
    return PenasPageResponse(
        items=[PenaResponse(**asdict(item)) for item in page.items],
        page=page.page,
        page_size=page.page_size,
        total=page.total,
        total_pages=total_pages,
    )


@router.get("/penas", response_model=PenasPageResponse)
def list_penas(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(default=None),
    session=Depends(get_current_session),
    use_case: GetPenasUseCase = Depends(get_penas_use_case),
):
    if session.user_type == "admin":
        result = use_case.execute_for_admin(
            session.user_id, page=page, page_size=page_size, search=search
        )
        return _page_response(result)
    if session.user_type == "user":
        result = use_case.execute_for_user(
            session.user_id, page=page, page_size=page_size, search=search
        )
        return _page_response(result)
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid session type")


@router.get("/penas/{pena_guid}", response_model=PenaResponse)
def get_pena(
    pena_guid: str,
    _session=Depends(authorize_pena_access),
    use_case: GetPenasUseCase = Depends(get_penas_use_case),
):
    pena = use_case.execute_by_guid(pena_guid)
    if not pena:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    return PenaResponse(**asdict(pena))


@router.post("/penas/{pena_guid}/link-tokens", response_model=LinkTokenResponse)
def create_link_token(
    pena_guid: str,
    admin_session=Depends(require_admin),
    use_case: GeneratePenaLinkTokenUseCase = Depends(get_generate_pena_link_token_use_case),
):
    try:
        created = use_case.execute(
            admin_id=admin_session.user_id,
            pena_guid=pena_guid,
            ttl_seconds=app_config.LINK_TOKEN_TTL_SECONDS,
        )
    except PenaAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin does not manage this pena",
        )
    return LinkTokenResponse(
        token=created.token, pena_guid=created.pena_guid, expires_at=created.expires_at
    )


@router.post("/penas/link/consume")
def consume_link_token(
    payload: ConsumeLinkTokenRequest,
    session=Depends(get_current_session),
    use_case: LinkUserToPenaUseCase = Depends(get_link_user_to_pena_use_case),
):
    if session.user_type != "user":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User access only")
    try:
        use_case.execute(
            token=payload.token,
            account_id=session.user_id,
            nickname=payload.nickname,
            position=payload.position,
        )
    except InvalidLinkTokenError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired link token",
        )
    except UserAlreadyLinkedError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already linked to this pena",
        )
    except UserProfileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User player profile not found",
        )
    return {"status": "ok"}
