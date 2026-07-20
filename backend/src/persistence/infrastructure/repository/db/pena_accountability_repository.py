from datetime import date

from core.application.ports.pena_accountability_port import (
    PenaAccountabilityMemberAccountResult,
    PenaAccountabilityPort,
    PenaAccountabilityResult,
    PenaMonthlyCashflowResult,
    PenaTransactionPageResult,
    PenaTransactionResult,
)
from core.domain.errors import (
    PenaAccountabilityAccessDeniedError,
    PenaAccountabilityMemberNotFoundError,
    PenaAccountabilityPenaNotFoundError,
    PenaAccountabilityTransactionNotFoundError,
)
from persistence.infrastructure.entity import (
    Pena,
    PenaAccountability,
    PenaMemberAccount,
    PenaPlayer,
    PenaTransaction,
    Player,
)
from sqlalchemy import and_, case, extract, func, select
from sqlalchemy.orm import Session

DEFAULT_CURRENCY = "EUR"
DEFAULT_VISIBILITY = "summary"
MONTHS_OF_HISTORY = 12


class SqlAlchemyPenaAccountabilityRepository(PenaAccountabilityPort):
    def __init__(self, session: Session):
        self.session = session

    def get_for_pena(self, *, pena_guid: str) -> PenaAccountabilityResult:
        pena = self._get_pena(pena_guid)
        return self._build_result(pena_id=pena.id)

    def list_transactions_for_pena(
        self,
        *,
        pena_guid: str,
        page: int,
        page_size: int,
        type_filter: str | None,
    ) -> PenaTransactionPageResult:
        pena = self._get_pena(pena_guid)
        conditions = [PenaTransaction.id_pena == pena.id]
        if type_filter in ("income", "expense"):
            conditions.append(PenaTransaction.type == type_filter)

        total = self.session.execute(
            select(func.count(PenaTransaction.id)).where(*conditions)
        ).scalar_one()

        offset = (page - 1) * page_size
        rows = self.session.execute(
            select(PenaTransaction, Player, PenaPlayer)
            .outerjoin(Player, Player.id == PenaTransaction.id_player)
            .outerjoin(
                PenaPlayer,
                and_(
                    PenaPlayer.id_player == PenaTransaction.id_player,
                    PenaPlayer.id_pena == PenaTransaction.id_pena,
                ),
            )
            .where(*conditions)
            .order_by(PenaTransaction.occurred_on.desc(), PenaTransaction.id.desc())
            .limit(page_size)
            .offset(offset)
        ).all()

        items = [
            self._to_transaction_result(transaction, player, link)
            for transaction, player, link in rows
        ]
        return PenaTransactionPageResult(items=items, total=int(total or 0))

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
            raise PenaAccountabilityMemberNotFoundError()

        self.session.delete(member_account)
        self.session.commit()
        return self._build_result(pena_id=pena.id)

    def record_transaction_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        type: str,
        amount_cents: int,
        concept: str,
        occurred_on: date,
        entity: str | None,
        category: str | None,
        note: str | None,
        player_guid: str | None,
    ) -> PenaAccountabilityResult:
        pena = self._lock_pena(pena_guid)
        self._ensure_admin_manages_pena(pena=pena, admin_id=admin_id)

        player_id = None
        if player_guid:
            player = self._get_member_player_for_pena(pena_id=pena.id, player_guid=player_guid)
            player_id = player.id

        transaction = PenaTransaction(
            id_pena=pena.id,
            type=type,
            amount_cents=amount_cents,
            entity=entity,
            concept=concept,
            category=category,
            note=note,
            occurred_on=occurred_on,
            id_player=player_id,
        )
        self.session.add(transaction)

        # Dues integration: a member-linked income pays down that member's debt.
        if type == "income" and player_id is not None:
            self._apply_income_to_member(
                pena_id=pena.id, player_id=player_id, amount_cents=amount_cents
            )

        self.session.commit()
        return self._build_result(pena_id=pena.id)

    def delete_transaction_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        transaction_guid: str,
    ) -> PenaAccountabilityResult:
        pena = self._lock_pena(pena_guid)
        self._ensure_admin_manages_pena(pena=pena, admin_id=admin_id)
        transaction = self.session.execute(
            select(PenaTransaction)
            .where(
                PenaTransaction.id_pena == pena.id,
                PenaTransaction.guid == transaction_guid,
            )
            .with_for_update()
        ).scalar_one_or_none()
        if transaction is None:
            self.session.rollback()
            raise PenaAccountabilityTransactionNotFoundError()

        # Reverse the dues effect a member-linked income had applied.
        if transaction.type == "income" and transaction.id_player is not None:
            self._reverse_income_from_member(
                pena_id=pena.id,
                player_id=transaction.id_player,
                amount_cents=int(transaction.amount_cents or 0),
            )

        self.session.delete(transaction)
        self.session.commit()
        return self._build_result(pena_id=pena.id)

    def get_player_guid_by_account(self, *, account_id: int) -> str | None:
        return self.session.execute(
            select(Player.guid).where(Player.id_player_account == account_id)
        ).scalar_one_or_none()

    # --- helpers -------------------------------------------------------------

    def _get_pena(self, pena_guid: str) -> Pena:
        stmt = select(Pena).where(Pena.guid == pena_guid)
        pena = self.session.execute(stmt).scalar_one_or_none()
        if not pena:
            self.session.rollback()
            raise PenaAccountabilityPenaNotFoundError()
        return pena

    def _lock_pena(self, pena_guid: str) -> Pena:
        pena = self.session.execute(
            select(Pena).where(Pena.guid == pena_guid).with_for_update()
        ).scalar_one_or_none()
        if not pena:
            self.session.rollback()
            raise PenaAccountabilityPenaNotFoundError()
        return pena

    def _ensure_admin_manages_pena(self, *, pena: Pena, admin_id: int) -> None:
        if pena.id_admin != admin_id:
            self.session.rollback()
            raise PenaAccountabilityAccessDeniedError()

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
            raise PenaAccountabilityMemberNotFoundError()
        return player

    def _apply_income_to_member(self, *, pena_id: int, player_id: int, amount_cents: int) -> None:
        account = self.session.execute(
            select(PenaMemberAccount)
            .where(
                PenaMemberAccount.id_pena == pena_id,
                PenaMemberAccount.id_player == player_id,
            )
            .with_for_update()
        ).scalar_one_or_none()
        if account is None:
            account = PenaMemberAccount(
                id_pena=pena_id, id_player=player_id, debt_cents=0, contribution_cents=0
            )
            self.session.add(account)
        account.contribution_cents = int(account.contribution_cents or 0) + amount_cents
        account.debt_cents = max(0, int(account.debt_cents or 0) - amount_cents)

    def _reverse_income_from_member(
        self, *, pena_id: int, player_id: int, amount_cents: int
    ) -> None:
        account = self.session.execute(
            select(PenaMemberAccount)
            .where(
                PenaMemberAccount.id_pena == pena_id,
                PenaMemberAccount.id_player == player_id,
            )
            .with_for_update()
        ).scalar_one_or_none()
        if account is None:
            return
        account.contribution_cents = max(0, int(account.contribution_cents or 0) - amount_cents)
        account.debt_cents = int(account.debt_cents or 0) + amount_cents

    @staticmethod
    def _display_name(player: Player, link: PenaPlayer | None) -> str:
        nickname = (link.nickname or "").strip() if link else ""
        if nickname:
            return nickname
        full_name = " ".join([player.name, player.surname1, player.surname2 or ""]).strip()
        return full_name or player.guid

    def _to_transaction_result(
        self, transaction: PenaTransaction, player: Player | None, link: PenaPlayer | None
    ) -> PenaTransactionResult:
        player_guid = player.guid if player else None
        player_name = self._display_name(player, link) if player else None
        return PenaTransactionResult(
            guid=transaction.guid,
            type=transaction.type,
            amount_cents=int(transaction.amount_cents or 0),
            entity=transaction.entity,
            concept=transaction.concept,
            category=transaction.category,
            note=transaction.note,
            occurred_on=transaction.occurred_on,
            player_guid=player_guid,
            player_name=player_name,
            created_at=transaction.created_at,
            updated_at=transaction.updated_at,
        )

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

        member_accounts = [
            PenaAccountabilityMemberAccountResult(
                player_guid=player.guid,
                player_name=self._display_name(player, link),
                debt_cents=int(account.debt_cents or 0),
                contribution_cents=int(account.contribution_cents or 0),
                note=account.note,
                updated_at=account.updated_at,
            )
            for account, player, link in account_rows
        ]

        totals = self.session.execute(
            select(
                func.coalesce(
                    func.sum(
                        case(
                            (PenaTransaction.type == "income", PenaTransaction.amount_cents),
                            else_=0,
                        )
                    ),
                    0,
                ),
                func.coalesce(
                    func.sum(
                        case(
                            (PenaTransaction.type == "expense", PenaTransaction.amount_cents),
                            else_=0,
                        )
                    ),
                    0,
                ),
            ).where(PenaTransaction.id_pena == pena_id)
        ).one()
        total_income = int(totals[0] or 0)
        total_expense = int(totals[1] or 0)

        month_start = date.today().replace(day=1)
        expenses_this_month_count = self.session.execute(
            select(func.count(PenaTransaction.id)).where(
                PenaTransaction.id_pena == pena_id,
                PenaTransaction.type == "expense",
                PenaTransaction.occurred_on >= month_start,
            )
        ).scalar_one()

        monthly_cashflow = self._monthly_cashflow(pena_id=pena_id)

        return PenaAccountabilityResult(
            currency=(row.currency if row else DEFAULT_CURRENCY),
            opening_balance_cents=int(row.balance_cents if row else 0),
            reserve_cents=int(row.reserve_cents if row else 0),
            budget_visibility=(row.budget_visibility if row else DEFAULT_VISIBILITY),
            expenses_visibility=(row.expenses_visibility if row else DEFAULT_VISIBILITY),
            member_accounts=member_accounts,
            total_income_cents=total_income,
            total_expense_cents=total_expense,
            expenses_this_month_count=int(expenses_this_month_count or 0),
            monthly_cashflow=monthly_cashflow,
            updated_at=row.updated_at if row else None,
        )

    def _monthly_cashflow(self, *, pena_id: int) -> list[PenaMonthlyCashflowResult]:
        year_col = extract("year", PenaTransaction.occurred_on)
        month_col = extract("month", PenaTransaction.occurred_on)
        rows = self.session.execute(
            select(
                year_col.label("period_year"),
                month_col.label("period_month"),
                func.coalesce(
                    func.sum(
                        case(
                            (PenaTransaction.type == "income", PenaTransaction.amount_cents),
                            else_=0,
                        )
                    ),
                    0,
                ).label("income_cents"),
                func.coalesce(
                    func.sum(
                        case(
                            (PenaTransaction.type == "expense", PenaTransaction.amount_cents),
                            else_=0,
                        )
                    ),
                    0,
                ).label("expense_cents"),
            )
            .where(PenaTransaction.id_pena == pena_id)
            .group_by(year_col, month_col)
            .order_by(year_col, month_col)
        ).all()
        monthly = [
            PenaMonthlyCashflowResult(
                year=int(entry.period_year),
                month=int(entry.period_month),
                income_cents=int(entry.income_cents or 0),
                expense_cents=int(entry.expense_cents or 0),
            )
            for entry in rows
        ]
        return monthly[-MONTHS_OF_HISTORY:]
