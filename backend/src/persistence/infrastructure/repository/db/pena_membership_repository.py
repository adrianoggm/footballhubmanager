from core.application.policies import FieldUpdate
from core.application.ports.pena_membership_port import (
    InvalidNationalityError,
    InvalidPositionLabelError,
    InvalidRoleLabelError,
    PenaMembershipNotFoundError,
    PenaMembershipPort,
    PenaMembershipResult,
    PenaNotFoundError,
    PenaNotManagedByAdminError,
    PlayerNotFoundError,
    UserPlayerNotFoundError,
)
from core.domain.label_config import (
    DEFAULT_POSITION_LABELS,
    DEFAULT_ROLE_LABELS,
    default_role_label,
    find_label,
    parse_labels_payload,
)
from persistence.infrastructure.entity import Nationality, Pena, PenaPlayer, PenaRole, Player
from sqlalchemy import select
from sqlalchemy.orm import Session


class SqlAlchemyPenaMembershipRepository(PenaMembershipPort):
    def __init__(self, session: Session):
        self.session = session

    def get_by_pena_and_player(self, *, pena_guid: str, player_guid: str) -> PenaMembershipResult:
        pena = self._get_pena(pena_guid)
        player = self._get_player_by_guid(player_guid)
        link = self._get_link(pena_id=pena.id, player_id=player.id)
        roles = self._get_roles_for_pena(pena.id)
        return self._to_result(pena=pena, player=player, link=link, roles=roles)

    def get_by_pena_and_account(self, *, pena_guid: str, account_id: int) -> PenaMembershipResult:
        pena = self._get_pena(pena_guid)
        player = self._get_player_by_account(account_id)
        link = self._get_link(pena_id=pena.id, player_id=player.id)
        roles = self._get_roles_for_pena(pena.id)
        return self._to_result(pena=pena, player=player, link=link, roles=roles)

    def update_by_account(
        self,
        *,
        pena_guid: str,
        account_id: int,
        nickname: FieldUpdate[str | None],
        role: FieldUpdate[str | None],
        position: FieldUpdate[str | None],
    ) -> PenaMembershipResult:
        pena = self._get_pena(pena_guid)
        player = self._get_player_by_account(account_id)
        roles = self._lock_roles_for_pena(pena.id)
        link = self._lock_link(pena_id=pena.id, player_id=player.id)

        if nickname.is_set():
            link.nickname = nickname.value
        if role.is_set():
            link.id_role = self._resolve_assigned_role_id(
                roles=roles,
                player=player,
                role=role.value,
            )
        if position.is_set():
            link.position = self._resolve_position(
                pena=pena, position=position.value, current=link.position
            )

        self.session.commit()
        return self._to_result(pena=pena, player=player, link=link, roles=roles)

    def delete_by_account(
        self,
        *,
        pena_guid: str,
        account_id: int,
    ) -> None:
        pena = self._get_pena(pena_guid)
        player = self._get_player_by_account(account_id)
        link = self._lock_link(pena_id=pena.id, player_id=player.id)

        self.session.delete(link)
        self.session.commit()

    def update_by_player_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        player_guid: str,
        nickname: FieldUpdate[str | None],
        role: FieldUpdate[str | None],
        position: FieldUpdate[str | None],
    ) -> PenaMembershipResult:
        pena = self._get_pena(pena_guid)
        if pena.id_admin != admin_id:
            self.session.rollback()
            raise PenaNotManagedByAdminError()

        player = self._get_player_by_guid(player_guid)
        roles = self._lock_roles_for_pena(pena.id)
        link = self._lock_link(pena_id=pena.id, player_id=player.id)

        if nickname.is_set():
            link.nickname = nickname.value
        if role.is_set():
            link.id_role = self._resolve_assigned_role_id(
                roles=roles,
                player=player,
                role=role.value,
            )
        if position.is_set():
            link.position = self._resolve_position(
                pena=pena, position=position.value, current=link.position
            )

        self.session.commit()
        return self._to_result(pena=pena, player=player, link=link, roles=roles)

    def delete_by_player_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        player_guid: str,
    ) -> None:
        pena = self._get_pena(pena_guid)
        if pena.id_admin != admin_id:
            self.session.rollback()
            raise PenaNotManagedByAdminError()

        player = self._get_player_by_guid(player_guid)
        link = self._lock_link(pena_id=pena.id, player_id=player.id)

        self.session.delete(link)
        self.session.commit()

    def create_guest_player_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        name: str,
        surname1: str,
        surname2: str | None,
        nationality: str,
        nickname: str | None,
        role: str | None,
        position: str | None,
    ) -> PenaMembershipResult:
        pena = self._get_pena(pena_guid)
        if pena.id_admin != admin_id:
            self.session.rollback()
            raise PenaNotManagedByAdminError()

        resolved_position = self._resolve_position(pena=pena, position=position, current=None)

        nationality_exists = self.session.execute(
            select(Nationality.name).where(Nationality.name == nationality)
        ).scalar_one_or_none()
        if not nationality_exists:
            self.session.rollback()
            raise InvalidNationalityError()

        player = Player(
            name=name,
            surname1=surname1,
            surname2=surname2,
            nationality=nationality,
            id_player_account=None,
        )
        self.session.add(player)
        self.session.flush()

        roles = self._lock_roles_for_pena(pena.id)
        link = PenaPlayer(
            id_player=player.id,
            id_pena=pena.id,
            nickname=nickname,
            id_role=self._resolve_assigned_role_id(roles=roles, player=player, role=role),
            position=resolved_position,
        )
        self.session.add(link)
        self.session.commit()
        self.session.refresh(player)
        self.session.refresh(link)
        return self._to_result(pena=pena, player=player, link=link, roles=roles)

    def _get_pena(self, pena_guid: str) -> Pena:
        pena = self.session.execute(select(Pena).where(Pena.guid == pena_guid)).scalar_one_or_none()
        if not pena:
            self.session.rollback()
            raise PenaNotFoundError()
        return pena

    def _get_player_by_guid(self, player_guid: str) -> Player:
        player = self.session.execute(
            select(Player).where(Player.guid == player_guid)
        ).scalar_one_or_none()
        if not player:
            self.session.rollback()
            raise PlayerNotFoundError()
        return player

    def _get_player_by_account(self, account_id: int) -> Player:
        player = self.session.execute(
            select(Player).where(Player.id_player_account == account_id)
        ).scalar_one_or_none()
        if not player:
            self.session.rollback()
            raise UserPlayerNotFoundError()
        return player

    def _get_link(self, *, pena_id: int, player_id: int) -> PenaPlayer:
        stmt = select(PenaPlayer).where(
            PenaPlayer.id_pena == pena_id, PenaPlayer.id_player == player_id
        )
        link = self.session.execute(stmt).scalar_one_or_none()
        if not link:
            self.session.rollback()
            raise PenaMembershipNotFoundError()
        return link

    def _lock_link(self, *, pena_id: int, player_id: int) -> PenaPlayer:
        link = self.session.execute(
            select(PenaPlayer)
            .where(PenaPlayer.id_pena == pena_id, PenaPlayer.id_player == player_id)
            .with_for_update()
        ).scalar_one_or_none()
        if not link:
            self.session.rollback()
            raise PenaMembershipNotFoundError()
        return link

    def _get_roles_for_pena(self, pena_id: int) -> list[PenaRole]:
        stmt = (
            select(PenaRole)
            .where(PenaRole.id_pena == pena_id)
            .order_by(PenaRole.sort_order.asc(), PenaRole.id.asc())
        )
        return list(self.session.execute(stmt).scalars().all())

    def _lock_roles_for_pena(self, pena_id: int) -> list[PenaRole]:
        return list(
            self.session.execute(
                select(PenaRole)
                .where(PenaRole.id_pena == pena_id)
                .order_by(PenaRole.sort_order.asc(), PenaRole.id.asc())
                .with_for_update()
            )
            .scalars()
            .all()
        )

    @staticmethod
    def _find_role_by_name(roles: list[PenaRole], role_name: str) -> PenaRole | None:
        role_key = role_name.casefold()
        for role in roles:
            if role.name.casefold() == role_key:
                return role
        return None

    def _resolve_assigned_role_id(
        self,
        *,
        roles: list[PenaRole],
        player: Player,
        role: str | None,
    ) -> int | None:
        if not roles:
            return None

        if role is not None:
            matched = self._find_role_by_name(roles, role)
            if not matched:
                self.session.rollback()
                raise InvalidRoleLabelError()
            return matched.id

        # PL-04: a membership always has a role; omitting it means the pena's
        # deterministic default member role (never the first/top label).
        resolved_name = default_role_label(
            [item.name for item in roles],
            has_account=player.id_player_account is not None,
        )
        matched = self._find_role_by_name(roles, resolved_name) if resolved_name else None
        return matched.id if matched else None

    def _resolve_position(
        self,
        *,
        pena: Pena,
        position: str | None,
        current: str | None,
    ) -> str | None:
        """Accept only the pena's configured position labels (canonical casing).

        Re-sending the currently stored value is tolerated so legacy positions
        stored before labels were enforced do not block unrelated edits.
        """
        if position is None:
            return None
        if current is not None and position == current:
            return current
        allowed = parse_labels_payload(pena.position_labels, fallback=DEFAULT_POSITION_LABELS)
        matched = find_label(allowed, position)
        if matched is None:
            self.session.rollback()
            raise InvalidPositionLabelError()
        return matched

    def _resolve_assigned_role_name(
        self,
        *,
        roles: list[PenaRole],
        player: Player,
        role_id: int | None,
    ) -> str:
        if role_id is not None:
            for role in roles:
                if role.id == role_id:
                    return role.name

        has_account = player.id_player_account is not None
        role_names = [item.name for item in roles] or list(DEFAULT_ROLE_LABELS)
        fallback = "member" if has_account else "guest"
        return default_role_label(role_names, has_account=has_account) or fallback

    def _to_result(
        self,
        *,
        pena: Pena,
        player: Player,
        link: PenaPlayer,
        roles: list[PenaRole],
    ) -> PenaMembershipResult:
        assigned_role = self._resolve_assigned_role_name(
            roles=roles,
            player=player,
            role_id=link.id_role,
        )
        return PenaMembershipResult(
            pena_guid=pena.guid,
            player_guid=player.guid,
            name=player.name,
            surname1=player.surname1,
            surname2=player.surname2,
            nationality=player.nationality,
            nickname=link.nickname,
            role=assigned_role,
            position=link.position,
        )
