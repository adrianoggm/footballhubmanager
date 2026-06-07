from datetime import date

from core.application.ports.pena_accountability_port import (
    PenaAccountabilityExpenseResult,
    PenaAccountabilityMemberAccountResult,
    PenaAccountabilityPort,
    PenaAccountabilityResult,
    PenaExpenseNotFoundError,
    PenaMemberNotFoundError,
    PenaNotFoundError,
    PenaNotManagedByAdminError,
)
from persistence.domain.entity import (
    Pena,
    PenaAccountability,
    PenaExpense,
    PenaMemberAccount,
    PenaPlayer,
    Player,
)
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

DEFAULT_CURRENCY = "EUR"
DEFAULT_VISIBILITY = "summary"


class SqlAlchemyPenaAccountabilityRepository(PenaAccountabilityPort):
    def __init__(self, session: Session):
        self.session = session

    def get_for_pena(self, *, pena_guid: str) -> PenaAccountabilityResult:
        pena = self._get_pena(pena_guid)
        return self._build_result(pena_id=pena.id)

    def save_settings_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        currency: str,
        balance_cents: int,
        reserve_cents: int,
        budget_visibility: str,
        expenses_visibility: str,
    ) -> PenaAccountabilityResult:
        pena = self._lock_pena(pena_guid)
        self._ensure_admin_manages_pena(pena=pena, admin_id=admin_id)
        row = self._get_or_create_locked_accountability_row(pena_id=pena.id)
        row.currency = currency
        row.balance_cents = balance_cents
        row.reserve_cents = reserve_cents
        row.budget_visibility = budget_visibility
        row.expenses_visibility = expenses_visibility
        self.session.commit()
        return self._build_result(pena_id=pena.id)

    def upsert_member_account_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        player_guid: str,
        debt_cents: int,
        contribution_cents: int,
        note: str | None,
    ) -> PenaAccountabilityResult:
        pena = self._lock_pena(pena_guid)
        self._ensure_admin_manages_pena(pena=pena, admin_id=admin_id)
        player = self._get_member_player_for_pena(pena_id=pena.id, player_guid=player_guid)

        member_account = self.session.execute(
            select(PenaMemberAccount)
            .where(
                PenaMemberAccount.id_pena == pena.id,
                PenaMemberAccount.id_player == player.id,
            )
            .with_for_update()
        ).scalar_one_or_none()
        if member_account is None:
            member_account = PenaMemberAccount(id_pena=pena.id, id_player=player.id)
            self.session.add(member_account)

        member_account.debt_cents = debt_cents
        member_account.contribution_cents = contribution_cents
        member_account.note = note
        self.session.commit()
        return self._build_result(pena_id=pena.id)

    def delete_member_account_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        player_guid: str,
    ) -> PenaAccountabilityResult:
        pena = self._lock_pena(pena_guid)
        self._ensure_admin_manages_pena(pena=pena, admin_id=admin_id)
        player = self._get_member_player_for_pena(pena_id=pena.id, player_guid=player_guid)

        member_account = self.session.execute(
            select(PenaMemberAccount)
            .where(
                PenaMemberAccount.id_pena == pena.id,
                PenaMemberAccount.id_player == player.id,
            )
            .with_for_update()
        ).scalar_one_or_none()
        if member_account is None:
            self.session.rollback()
            raise PenaMemberNotFoundError()

        self.session.delete(member_account)
        self.session.commit()
        return self._build_result(pena_id=pena.id)

    def create_expense_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        title: str,
        category: str | None,
        amount_cents: int,
        occurred_on: date,
        note: str | None,
    ) -> PenaAccountabilityResult:
        pena = self._lock_pena(pena_guid)
        self._ensure_admin_manages_pena(pena=pena, admin_id=admin_id)
        expense = PenaExpense(
            id_pena=pena.id,
            title=title,
            category=category,
            amount_cents=amount_cents,
            occurred_on=occurred_on,
            note=note,
        )
        self.session.add(expense)
        self.session.commit()
        return self._build_result(pena_id=pena.id)

    def delete_expense_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        expense_guid: str,
    ) -> PenaAccountabilityResult:
        pena = self._lock_pena(pena_guid)
        self._ensure_admin_manages_pena(pena=pena, admin_id=admin_id)
        expense = self.session.execute(
            select(PenaExpense)
            .where(PenaExpense.id_pena == pena.id, PenaExpense.guid == expense_guid)
            .with_for_update()
        ).scalar_one_or_none()
        if expense is None:
            self.session.rollback()
            raise PenaExpenseNotFoundError()

        self.session.delete(expense)
        self.session.commit()
        return self._build_result(pena_id=pena.id)

    def get_player_guid_by_account(self, *, account_id: int) -> str | None:
        return self.session.execute(
            select(Player.guid).where(Player.id_player_account == account_id)
        ).scalar_one_or_none()

    def _get_pena(self, pena_guid: str) -> Pena:
        stmt = select(Pena).where(Pena.guid == pena_guid)
        pena = self.session.execute(stmt).scalar_one_or_none()
        if not pena:
            self.session.rollback()
            raise PenaNotFoundError()
        return pena

    def _lock_pena(self, pena_guid: str) -> Pena:
        pena = self.session.execute(
            select(Pena).where(Pena.guid == pena_guid).with_for_update()
        ).scalar_one_or_none()
        if not pena:
            self.session.rollback()
            raise PenaNotFoundError()
        return pena

    def _ensure_admin_manages_pena(self, *, pena: Pena, admin_id: int) -> None:
        if pena.id_admin != admin_id:
            self.session.rollback()
            raise PenaNotManagedByAdminError()

    def _get_or_create_locked_accountability_row(self, *, pena_id: int) -> PenaAccountability:
        row = self.session.execute(
            select(PenaAccountability)
            .where(PenaAccountability.id_pena == pena_id)
            .with_for_update()
        ).scalar_one_or_none()
        if row:
            return row
        row = PenaAccountability(
            id_pena=pena_id,
            currency=DEFAULT_CURRENCY,
            balance_cents=0,
            reserve_cents=0,
            budget_visibility=DEFAULT_VISIBILITY,
            expenses_visibility=DEFAULT_VISIBILITY,
        )
        self.session.add(row)
        self.session.flush()
        return row

    def _get_member_player_for_pena(self, *, pena_id: int, player_guid: str) -> Player:
        player = self.session.execute(
            select(Player)
            .join(PenaPlayer, PenaPlayer.id_player == Player.id)
            .where(PenaPlayer.id_pena == pena_id, Player.guid == player_guid)
        ).scalar_one_or_none()
        if player is None:
            self.session.rollback()
            raise PenaMemberNotFoundError()
        return player

    def _build_result(self, *, pena_id: int) -> PenaAccountabilityResult:
        row = self.session.execute(
            select(PenaAccountability).where(PenaAccountability.id_pena == pena_id)
        ).scalar_one_or_none()

        account_rows = self.session.execute(
            select(PenaMemberAccount, Player, PenaPlayer)
            .join(Player, Player.id == PenaMemberAccount.id_player)
            .outerjoin(
                PenaPlayer,
                and_(
                    PenaPlayer.id_player == Player.id,
                    PenaPlayer.id_pena == PenaMemberAccount.id_pena,
                ),
            )
            .where(PenaMemberAccount.id_pena == pena_id)
            .order_by(Player.name.asc(), Player.surname1.asc(), Player.surname2.asc())
        ).all()

        member_accounts: list[PenaAccountabilityMemberAccountResult] = []
        for account, player, link in account_rows:
            full_name = " ".join([player.name, player.surname1, player.surname2 or ""]).strip()
            player_name = (link.nickname or "").strip() if link else ""
            if not player_name:
                player_name = full_name or player.guid
            member_accounts.append(
                PenaAccountabilityMemberAccountResult(
                    player_guid=player.guid,
                    player_name=player_name,
                    debt_cents=int(account.debt_cents or 0),
                    contribution_cents=int(account.contribution_cents or 0),
                    note=account.note,
                    updated_at=account.updated_at,
                )
            )

        expense_rows = self.session.execute(
            select(PenaExpense)
            .where(PenaExpense.id_pena == pena_id)
            .order_by(PenaExpense.occurred_on.desc(), PenaExpense.id.desc())
        ).scalars()
        expenses = [
            PenaAccountabilityExpenseResult(
                guid=item.guid,
                title=item.title,
                category=item.category,
                amount_cents=int(item.amount_cents or 0),
                occurred_on=item.occurred_on,
                note=item.note,
                created_at=item.created_at,
                updated_at=item.updated_at,
            )
            for item in expense_rows
        ]

        return PenaAccountabilityResult(
            currency=(row.currency if row else DEFAULT_CURRENCY),
            balance_cents=int(row.balance_cents if row else 0),
            reserve_cents=int(row.reserve_cents if row else 0),
            budget_visibility=(row.budget_visibility if row else DEFAULT_VISIBILITY),
            expenses_visibility=(row.expenses_visibility if row else DEFAULT_VISIBILITY),
            member_accounts=member_accounts,
            expenses=expenses,
            updated_at=row.updated_at if row else None,
        )
