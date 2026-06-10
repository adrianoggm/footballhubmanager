import math
from dataclasses import asdict

from api.dependencies.use_cases import (
    get_generate_pena_link_token_use_case,
    get_link_user_to_pena_use_case,
    get_pena_accountability_use_case,
    get_pena_command_bus,
    get_pena_labels_use_case,
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
    UpdatePenaProfileRequest,
)
from api.interface.controller.v1.model.response.pena_accountability_response import (
    PenaAccountabilityMemberAccountResponse,
    PenaAccountabilityResponse,
    PenaExpenseResponse,
)
from api.interface.controller.v1.model.response.pena_labels_response import PenaLabelsResponse
from api.interface.controller.v1.model.response.penas_response import (
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
from core.application.models import (
    PenaAccountabilityExpenseCreate,
    PenaAccountabilityExpenseInfo,
    PenaAccountabilityInfo,
    PenaAccountabilityMemberAccountInfo,
    PenaAccountabilityMemberAccountUpsert,
    PenaAccountabilitySettingsUpdate,
    PenaLabelsUpdate,
    PenasPage,
)
from core.application.commands.update_pena_profile_command import UpdatePenaProfileCommand
from core.application.queries.pena_queries import (
    GetPenaByGuidQuery,
    ListPenasForAdminQuery,
    ListPenasForUserQuery,
)
from core.application.use_cases.generate_pena_link_token_usecase import (
    GeneratePenaLinkTokenUseCase,
)
from core.application.use_cases.link_user_to_pena_usecase import LinkUserToPenaUseCase
from core.application.use_cases.manage_pena_accountability_usecase import (
    ManagePenaAccountabilityUseCase,
)
from core.application.use_cases.manage_pena_labels_usecase import (
    ManagePenaLabelsUseCase,
)
from fastapi import APIRouter, Depends, HTTPException, Query, status
from shared.application.bus.buses import CommandBus, QueryBus

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
    use_case: ManagePenaLabelsUseCase = Depends(get_pena_labels_use_case),
):
    labels = use_case.get_for_pena(pena_guid=pena_guid)
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
    use_case: ManagePenaLabelsUseCase = Depends(get_pena_labels_use_case),
):
    labels = use_case.update_for_admin(
        pena_guid=pena_guid,
        admin_id=admin_session.user_id,
        update=PenaLabelsUpdate(
            role_labels=payload.role_labels,
            position_labels=payload.position_labels,
            role_colors=payload.role_colors,
            position_colors=payload.position_colors,
        ),
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
    use_case: GeneratePenaLinkTokenUseCase = Depends(get_generate_pena_link_token_use_case),
):
    created = use_case.execute(
        admin_id=admin_session.user_id,
        pena_guid=pena_guid,
        ttl_seconds=app_config.LINK_TOKEN_TTL_SECONDS,
    )
    return LinkTokenResponse(
        token=created.token, pena_guid=created.pena_guid, expires_at=created.expires_at
    )


@router.get("/penas/{pena_guid}/accountability", response_model=PenaAccountabilityResponse)
@map_exceptions
def get_pena_accountability(
    pena_guid: str,
    session=Depends(authorize_pena_access),
    use_case: ManagePenaAccountabilityUseCase = Depends(get_pena_accountability_use_case),
):
    info = use_case.get_for_pena(pena_guid=pena_guid)

    current_player_guid = None
    if session.user_type == "user":
        current_player_guid = use_case.get_player_guid_for_account(account_id=session.user_id)

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
    use_case: ManagePenaAccountabilityUseCase = Depends(get_pena_accountability_use_case),
):
    info = use_case.update_settings_for_admin(
        pena_guid=pena_guid,
        admin_id=admin_session.user_id,
        update=PenaAccountabilitySettingsUpdate(
            currency=payload.currency,
            balance_cents=payload.balance_cents,
            reserve_cents=payload.reserve_cents,
            budget_visibility=payload.budget_visibility,
            expenses_visibility=payload.expenses_visibility,
        ),
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
    use_case: ManagePenaAccountabilityUseCase = Depends(get_pena_accountability_use_case),
):
    info = use_case.upsert_member_account_for_admin(
        pena_guid=pena_guid,
        admin_id=admin_session.user_id,
        data=PenaAccountabilityMemberAccountUpsert(
            player_guid=player_guid,
            debt_cents=payload.debt_cents,
            contribution_cents=payload.contribution_cents,
            note=payload.note,
        ),
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
    use_case: ManagePenaAccountabilityUseCase = Depends(get_pena_accountability_use_case),
):
    info = use_case.remove_member_account_for_admin(
        pena_guid=pena_guid,
        admin_id=admin_session.user_id,
        player_guid=player_guid,
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
    use_case: ManagePenaAccountabilityUseCase = Depends(get_pena_accountability_use_case),
):
    info = use_case.create_expense_for_admin(
        pena_guid=pena_guid,
        admin_id=admin_session.user_id,
        data=PenaAccountabilityExpenseCreate(
            title=payload.title,
            category=payload.category,
            amount_cents=payload.amount_cents,
            occurred_on=payload.occurred_on,
            note=payload.note,
        ),
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
    use_case: ManagePenaAccountabilityUseCase = Depends(get_pena_accountability_use_case),
):
    info = use_case.remove_expense_for_admin(
        pena_guid=pena_guid,
        admin_id=admin_session.user_id,
        expense_guid=expense_guid,
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
    use_case: LinkUserToPenaUseCase = Depends(get_link_user_to_pena_use_case),
):
    use_case.execute(
        token=payload.token,
        account_id=session.user_id,
        nickname=payload.nickname,
        position=payload.position,
    )
    return {"status": "ok"}
