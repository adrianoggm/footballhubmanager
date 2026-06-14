import math
from dataclasses import asdict

from api.dependencies.use_cases import (
    get_pena_accountability_command_bus,
    get_pena_accountability_query_bus,
    get_pena_command_bus,
    get_pena_labels_command_bus,
    get_pena_labels_query_bus,
    get_pena_link_command_bus,
    get_pena_link_query_bus,
    get_pena_query_bus,
)
from api.interface.controller.v1.model.request.pena_accountability_request import (
    CreatePenaExpenseRequest,
    UpdatePenaAccountabilityRequest,
    UpsertPenaMemberAccountRequest,
)
from api.interface.controller.v1.model.request.pena_labels_request import UpdatePenaLabelsRequest
from api.interface.controller.v1.model.request.penas_request import (
    ConsumeLinkTokenRequest,
    RegisterAndClaimRequest,
    UpdatePenaProfileRequest,
)
from api.interface.controller.v1.model.response.auth_response import LoginResponse
from api.interface.controller.v1.model.response.pena_accountability_response import (
    PenaAccountabilityMemberAccountResponse,
    PenaAccountabilityResponse,
    PenaExpenseResponse,
)
from api.interface.controller.v1.model.response.pena_labels_response import PenaLabelsResponse
from api.interface.controller.v1.model.response.penas_response import (
    ClaimTokenInfoResponse,
    LinkTokenResponse,
    PenaResponse,
    PenasPageResponse,
)
from api.middleware.exception_mapper import map_exceptions
from app.config import config as app_config
from auth.dependencies import (
    authorize_pena_access,
    get_current_session,
    require_admin,
    require_user,
)
from auth.session import create_session
from core.application.commands.pena_accountability_commands import (
    CreateExpenseCommand,
    RemoveExpenseCommand,
    RemoveMemberAccountCommand,
    UpdateAccountabilitySettingsCommand,
    UpsertMemberAccountCommand,
)
from core.application.commands.pena_labels_command import UpdatePenaLabelsCommand
from core.application.commands.pena_link_commands import (
    GeneratePenaClaimTokenCommand,
    GeneratePenaLinkTokenCommand,
    LinkUserToPenaCommand,
    RegisterAndClaimPlayerCommand,
)
from core.application.commands.update_pena_profile_command import UpdatePenaProfileCommand
from core.application.models import (
    PenaAccountabilityExpenseInfo,
    PenaAccountabilityInfo,
    PenaAccountabilityMemberAccountInfo,
    PenasPage,
)
from core.application.queries.pena_accountability_queries import (
    GetPenaAccountabilityQuery,
    GetPlayerGuidForAccountQuery,
)
from core.application.queries.pena_labels_query import GetPenaLabelsQuery
from core.application.queries.pena_link_queries import InspectClaimTokenQuery
from core.application.queries.pena_queries import (
    GetPenaByGuidQuery,
    ListPenasForAdminQuery,
    ListPenasForUserQuery,
)
from fastapi import APIRouter, Depends, HTTPException, Query, status
from persistence.module import get_db
from shared.application.bus.buses import CommandBus, QueryBus
from sqlalchemy.orm import Session

router = APIRouter()


def _page_response(page: PenasPage) -> PenasPageResponse:
    total_pages = math.ceil(page.total / page.page_size) if page.total else 0
    return PenasPageResponse(
        items=[PenaResponse(**asdict(item)) for item in page.items],
        page=page.page,
        page_size=page.page_size,
        total=page.total,
        total_pages=total_pages,
    )


def _accountability_member_response(
    item: PenaAccountabilityMemberAccountInfo,
) -> PenaAccountabilityMemberAccountResponse:
    return PenaAccountabilityMemberAccountResponse(
        player_guid=item.player_guid,
        player_name=item.player_name,
        debt_cents=item.debt_cents,
        contribution_cents=item.contribution_cents,
        note=item.note,
        updated_at=item.updated_at,
    )


def _accountability_expense_response(item: PenaAccountabilityExpenseInfo) -> PenaExpenseResponse:
    return PenaExpenseResponse(
        guid=item.guid,
        title=item.title,
        category=item.category,
        amount_cents=item.amount_cents,
        occurred_on=item.occurred_on,
        note=item.note,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _accountability_response(
    *,
    info: PenaAccountabilityInfo,
    session,
    current_player_guid: str | None,
) -> PenaAccountabilityResponse:
    is_admin = session.user_type == "admin"
    budget_summary_visible = is_admin or info.budget_visibility in {"summary", "full"}
    budget_details_visible = is_admin or info.budget_visibility == "full"
    expenses_summary_visible = is_admin or info.expenses_visibility in {"summary", "full"}
    expenses_details_visible = is_admin or info.expenses_visibility == "full"

    my_account = None
    if current_player_guid:
        my_account_item = next(
            (item for item in info.member_accounts if item.player_guid == current_player_guid),
            None,
        )
        if my_account_item is not None:
            my_account = _accountability_member_response(my_account_item)

    member_accounts = (
        [_accountability_member_response(item) for item in info.member_accounts]
        if budget_details_visible
        else []
    )
    expenses = (
        [_accountability_expense_response(item) for item in info.expenses]
        if expenses_details_visible
        else []
    )

    return PenaAccountabilityResponse(
        currency=info.currency,
        balance_cents=info.balance_cents if budget_summary_visible else None,
        reserve_cents=info.reserve_cents if budget_summary_visible else None,
        budget_visibility=info.budget_visibility,
        expenses_visibility=info.expenses_visibility,
        member_accounts=member_accounts,
        my_account=my_account,
        expenses=expenses,
        total_debt_cents=info.total_debt_cents if budget_summary_visible else None,
        total_contribution_cents=info.total_contribution_cents if budget_summary_visible else None,
        total_expenses_cents=info.total_expenses_cents if expenses_summary_visible else None,
        current_cash_cents=info.current_cash_cents if budget_summary_visible else None,
        projected_balance_cents=info.projected_balance_cents if budget_summary_visible else None,
        expense_entries=info.expense_entries if expenses_summary_visible else None,
        updated_at=info.updated_at,
    )


@router.get("/penas", response_model=PenasPageResponse)
def list_penas(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(default=None),
    session=Depends(get_current_session),
    query_bus: QueryBus = Depends(get_pena_query_bus),
):
    if session.user_type == "admin":
        result = query_bus.ask(
            ListPenasForAdminQuery(
                admin_id=session.user_id, page=page, page_size=page_size, search=search
            )
        )
        return _page_response(result)
    if session.user_type == "user":
        result = query_bus.ask(
            ListPenasForUserQuery(
                account_id=session.user_id, page=page, page_size=page_size, search=search
            )
        )
        return _page_response(result)
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid session type")


@router.get("/penas/{pena_guid}", response_model=PenaResponse)
def get_pena(
    pena_guid: str,
    _session=Depends(authorize_pena_access),
    query_bus: QueryBus = Depends(get_pena_query_bus),
):
    pena = query_bus.ask(GetPenaByGuidQuery(pena_guid=pena_guid))
    if not pena:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pena not found")
    return PenaResponse(**asdict(pena))


@router.put("/penas/{pena_guid}/profile", response_model=PenaResponse)
@map_exceptions
def update_pena_profile(
    pena_guid: str,
    payload: UpdatePenaProfileRequest,
    admin_session=Depends(require_admin),
    command_bus: CommandBus = Depends(get_pena_command_bus),
):
    pena = command_bus.dispatch(
        UpdatePenaProfileCommand(
            pena_guid=pena_guid,
            admin_id=admin_session.user_id,
            image_url=payload.image_url,
        )
    )
    return PenaResponse(**asdict(pena))


@router.get("/penas/{pena_guid}/labels", response_model=PenaLabelsResponse)
@map_exceptions
def get_pena_labels(
    pena_guid: str,
    _session=Depends(authorize_pena_access),
    query_bus: QueryBus = Depends(get_pena_labels_query_bus),
):
    labels = query_bus.ask(GetPenaLabelsQuery(pena_guid=pena_guid))
    return PenaLabelsResponse(
        role_labels=labels.role_labels,
        position_labels=labels.position_labels,
        role_colors=labels.role_colors,
        position_colors=labels.position_colors,
    )


@router.put("/penas/{pena_guid}/labels", response_model=PenaLabelsResponse)
@map_exceptions
def update_pena_labels(
    pena_guid: str,
    payload: UpdatePenaLabelsRequest,
    admin_session=Depends(require_admin),
    command_bus: CommandBus = Depends(get_pena_labels_command_bus),
):
    labels = command_bus.dispatch(
        UpdatePenaLabelsCommand(
            pena_guid=pena_guid,
            admin_id=admin_session.user_id,
            role_labels=payload.role_labels,
            position_labels=payload.position_labels,
            role_colors=payload.role_colors,
            position_colors=payload.position_colors,
        )
    )
    return PenaLabelsResponse(
        role_labels=labels.role_labels,
        position_labels=labels.position_labels,
        role_colors=labels.role_colors,
        position_colors=labels.position_colors,
    )


@router.post("/penas/{pena_guid}/link-tokens", response_model=LinkTokenResponse)
@map_exceptions
def create_link_token(
    pena_guid: str,
    admin_session=Depends(require_admin),
    command_bus: CommandBus = Depends(get_pena_link_command_bus),
):
    created = command_bus.dispatch(
        GeneratePenaLinkTokenCommand(
            admin_id=admin_session.user_id,
            pena_guid=pena_guid,
            ttl_seconds=app_config.LINK_TOKEN_TTL_SECONDS,
        )
    )
    return LinkTokenResponse(
        token=created.token, pena_guid=created.pena_guid, expires_at=created.expires_at
    )


@router.post(
    "/penas/{pena_guid}/players/{player_guid}/claim-tokens",
    response_model=LinkTokenResponse,
)
@map_exceptions
def create_player_claim_token(
    pena_guid: str,
    player_guid: str,
    admin_session=Depends(require_admin),
    command_bus: CommandBus = Depends(get_pena_link_command_bus),
):
    created = command_bus.dispatch(
        GeneratePenaClaimTokenCommand(
            admin_id=admin_session.user_id,
            pena_guid=pena_guid,
            player_guid=player_guid,
            ttl_seconds=app_config.LINK_TOKEN_TTL_SECONDS,
        )
    )
    return LinkTokenResponse(
        token=created.token,
        pena_guid=created.pena_guid,
        expires_at=created.expires_at,
        player_guid=created.player_guid,
    )


@router.get("/penas/{pena_guid}/accountability", response_model=PenaAccountabilityResponse)
@map_exceptions
def get_pena_accountability(
    pena_guid: str,
    session=Depends(authorize_pena_access),
    query_bus: QueryBus = Depends(get_pena_accountability_query_bus),
):
    info = query_bus.ask(GetPenaAccountabilityQuery(pena_guid=pena_guid))

    current_player_guid = None
    if session.user_type == "user":
        current_player_guid = query_bus.ask(
            GetPlayerGuidForAccountQuery(account_id=session.user_id)
        )

    return _accountability_response(
        info=info,
        session=session,
        current_player_guid=current_player_guid,
    )


@router.put("/penas/{pena_guid}/accountability", response_model=PenaAccountabilityResponse)
@map_exceptions
def update_pena_accountability(
    pena_guid: str,
    payload: UpdatePenaAccountabilityRequest,
    admin_session=Depends(require_admin),
    command_bus: CommandBus = Depends(get_pena_accountability_command_bus),
):
    info = command_bus.dispatch(
        UpdateAccountabilitySettingsCommand(
            pena_guid=pena_guid,
            admin_id=admin_session.user_id,
            currency=payload.currency,
            balance_cents=payload.balance_cents,
            reserve_cents=payload.reserve_cents,
            budget_visibility=payload.budget_visibility,
            expenses_visibility=payload.expenses_visibility,
        )
    )
    return _accountability_response(
        info=info,
        session=admin_session,
        current_player_guid=None,
    )


@router.put(
    "/penas/{pena_guid}/accountability/members/{player_guid}",
    response_model=PenaAccountabilityResponse,
)
@map_exceptions
def upsert_member_accountability(
    pena_guid: str,
    player_guid: str,
    payload: UpsertPenaMemberAccountRequest,
    admin_session=Depends(require_admin),
    command_bus: CommandBus = Depends(get_pena_accountability_command_bus),
):
    info = command_bus.dispatch(
        UpsertMemberAccountCommand(
            pena_guid=pena_guid,
            admin_id=admin_session.user_id,
            player_guid=player_guid,
            debt_cents=payload.debt_cents,
            contribution_cents=payload.contribution_cents,
            note=payload.note,
        )
    )
    return _accountability_response(
        info=info,
        session=admin_session,
        current_player_guid=None,
    )


@router.delete(
    "/penas/{pena_guid}/accountability/members/{player_guid}",
    response_model=PenaAccountabilityResponse,
)
@map_exceptions
def delete_member_accountability(
    pena_guid: str,
    player_guid: str,
    admin_session=Depends(require_admin),
    command_bus: CommandBus = Depends(get_pena_accountability_command_bus),
):
    info = command_bus.dispatch(
        RemoveMemberAccountCommand(
            pena_guid=pena_guid,
            admin_id=admin_session.user_id,
            player_guid=player_guid,
        )
    )
    return _accountability_response(
        info=info,
        session=admin_session,
        current_player_guid=None,
    )


@router.post(
    "/penas/{pena_guid}/accountability/expenses",
    response_model=PenaAccountabilityResponse,
)
@map_exceptions
def create_pena_expense(
    pena_guid: str,
    payload: CreatePenaExpenseRequest,
    admin_session=Depends(require_admin),
    command_bus: CommandBus = Depends(get_pena_accountability_command_bus),
):
    info = command_bus.dispatch(
        CreateExpenseCommand(
            pena_guid=pena_guid,
            admin_id=admin_session.user_id,
            title=payload.title,
            category=payload.category,
            amount_cents=payload.amount_cents,
            occurred_on=payload.occurred_on,
            note=payload.note,
        )
    )
    return _accountability_response(
        info=info,
        session=admin_session,
        current_player_guid=None,
    )


@router.delete(
    "/penas/{pena_guid}/accountability/expenses/{expense_guid}",
    response_model=PenaAccountabilityResponse,
)
@map_exceptions
def delete_pena_expense(
    pena_guid: str,
    expense_guid: str,
    admin_session=Depends(require_admin),
    command_bus: CommandBus = Depends(get_pena_accountability_command_bus),
):
    info = command_bus.dispatch(
        RemoveExpenseCommand(
            pena_guid=pena_guid,
            admin_id=admin_session.user_id,
            expense_guid=expense_guid,
        )
    )
    return _accountability_response(
        info=info,
        session=admin_session,
        current_player_guid=None,
    )


@router.post("/penas/link/consume")
@map_exceptions
def consume_link_token(
    payload: ConsumeLinkTokenRequest,
    session=Depends(require_user),
    command_bus: CommandBus = Depends(get_pena_link_command_bus),
):
    command_bus.dispatch(
        LinkUserToPenaCommand(
            token=payload.token,
            account_id=session.user_id,
            nickname=payload.nickname,
            position=payload.position,
        )
    )
    return {"status": "ok"}


@router.get("/penas/link/claim/{token}", response_model=ClaimTokenInfoResponse)
@map_exceptions
def inspect_claim_token(
    token: str,
    query_bus: QueryBus = Depends(get_pena_link_query_bus),
):
    info = query_bus.ask(InspectClaimTokenQuery(token=token))
    return ClaimTokenInfoResponse(
        pena_guid=info.pena_guid,
        pena_name=info.pena_name,
        player_guid=info.player_guid,
        player_name=info.player_name,
        player_nickname=info.player_nickname,
        expires_at=info.expires_at,
    )


@router.post("/penas/link/claim", response_model=LoginResponse)
@map_exceptions
def register_and_claim_player(
    payload: RegisterAndClaimRequest,
    command_bus: CommandBus = Depends(get_pena_link_command_bus),
    db: Session = Depends(get_db),
):
    registered = command_bus.dispatch(
        RegisterAndClaimPlayerCommand(
            token=payload.token,
            username=payload.username,
            password=payload.password,
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
    return LoginResponse(
        token=session.token,
        token_type="session",
        expires_at=session.expires_at,
        user_guid=session.user_guid,
        user_type=session.user_type,
    )
