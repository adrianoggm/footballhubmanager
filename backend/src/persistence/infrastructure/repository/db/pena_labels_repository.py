"""SQLAlchemy adapter for the pena role/position label catalogs.

Label lifecycle policy (PL-03), applied on every catalog update:

- **Rename** (``*_renames``: ``old -> new``): the label keeps its identity. A
  renamed role keeps its ``pena_role`` row (so memberships follow it) and its
  colour; season snapshots and stored positions are rewritten to the new text.
- **Removal** (label gone without a rename):
  - roles: the memberships (and the pena's season snapshots) using it fall back
    to the membership's default role (``default_role_label``: ``member`` for
    players with an account, ``guest`` for players without one, otherwise the
    least privileged/last role) — never left orphaned;
  - positions: the players using it are left without position (``None``);
    positions have no hierarchy, so there is no meaningful fallback.
"""

from dataclasses import dataclass, field

from core.application.ports.pena_labels_port import (
    PenaLabelsPort,
    PenaLabelsResult,
)
from core.domain.errors import (
    InvalidPenaLabelsDataError,
    PenaLabelsAccessDeniedError,
    PenaLabelsPenaNotFoundError,
)
from core.domain.label_config import (
    DEFAULT_POSITION_LABEL_COLORS,
    DEFAULT_POSITION_LABELS,
    DEFAULT_ROLE_LABEL_COLORS,
    DEFAULT_ROLE_LABELS,
    align_label_colors,
    default_color_for_label,
    default_role_label,
    dump_label_colors_payload,
    dump_labels_payload,
    parse_label_colors_payload,
    parse_labels_payload,
)
from persistence.infrastructure.entity import Pena, PenaPlayer, PenaRole, Player, SeasonPlayer
from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session


@dataclass
class _AffectedMemberships:
    """Memberships whose role was removed, pending their fallback role."""

    pena_player_ids: list[int] = field(default_factory=list)
    season_player_keys: list[tuple[int, int]] = field(default_factory=list)


class SqlAlchemyPenaLabelsRepository(PenaLabelsPort):
    def __init__(self, session: Session):
        self.session = session

    def get_by_pena_guid(self, *, pena_guid: str) -> PenaLabelsResult:
        pena = self._get_pena(pena_guid)
        roles = self._get_roles_for_pena(pena.id)
        return self._to_result(pena=pena, roles=roles)

    def update_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        role_labels: list[str],
        position_labels: list[str],
        role_colors: dict[str, str],
        position_colors: dict[str, str],
        role_renames: dict[str, str],
        position_renames: dict[str, str],
    ) -> PenaLabelsResult:
        pena = self._lock_pena(pena_guid)
        if pena.id_admin != admin_id:
            self.session.rollback()
            raise PenaLabelsAccessDeniedError()

        current_roles = self._lock_roles_for_pena(pena.id)
        previous_position_labels = parse_labels_payload(
            pena.position_labels,
            fallback=DEFAULT_POSITION_LABELS,
        )
        updated_roles = self._sync_roles(
            pena_id=pena.id,
            current_roles=current_roles,
            desired_labels=role_labels,
            desired_colors=role_colors,
            renames=role_renames,
        )
        self._sync_player_positions(
            pena_id=pena.id,
            previous_labels=previous_position_labels,
            desired_labels=position_labels,
            renames=position_renames,
        )
        pena.position_labels = dump_labels_payload(position_labels)
        pena.position_label_colors = dump_label_colors_payload(position_colors)
        self.session.commit()
        return self._to_result(pena=pena, roles=updated_roles)

    def _get_pena(self, pena_guid: str) -> Pena:
        stmt = select(Pena).where(Pena.guid == pena_guid)
        pena = self.session.execute(stmt).scalar_one_or_none()
        if not pena:
            self.session.rollback()
            raise PenaLabelsPenaNotFoundError()
        return pena

    def _lock_pena(self, pena_guid: str) -> Pena:
        pena = self.session.execute(
            select(Pena).where(Pena.guid == pena_guid).with_for_update()
        ).scalar_one_or_none()
        if not pena:
            self.session.rollback()
            raise PenaLabelsPenaNotFoundError()
        return pena

    @staticmethod
    def _to_result(*, pena: Pena, roles: list[PenaRole]) -> PenaLabelsResult:
        role_labels = [item.name for item in roles] or list(DEFAULT_ROLE_LABELS)
        role_colors = align_label_colors(
            role_labels,
            configured_colors={item.name: item.color for item in roles if item.color},
            defaults=DEFAULT_ROLE_LABEL_COLORS,
        )

        position_labels = parse_labels_payload(
            pena.position_labels,
            fallback=DEFAULT_POSITION_LABELS,
        )
        position_colors = align_label_colors(
            position_labels,
            configured_colors=parse_label_colors_payload(pena.position_label_colors),
            defaults=DEFAULT_POSITION_LABEL_COLORS,
        )
        return PenaLabelsResult(
            role_labels=role_labels,
            position_labels=position_labels,
            role_colors=role_colors,
            position_colors=position_colors,
        )

    def _get_roles_for_pena(self, pena_id: int) -> list[PenaRole]:
        stmt = (
            select(PenaRole)
            .where(PenaRole.id_pena == pena_id)
            .order_by(
                PenaRole.sort_order.asc(),
                PenaRole.id.asc(),
            )
        )
        return list(self.session.execute(stmt).scalars().all())

    def _lock_roles_for_pena(self, pena_id: int) -> list[PenaRole]:
        stmt = (
            select(PenaRole)
            .where(PenaRole.id_pena == pena_id)
            .order_by(
                PenaRole.sort_order.asc(),
                PenaRole.id.asc(),
            )
            .with_for_update()
        )
        return list(self.session.execute(stmt).scalars().all())

    def _sync_roles(
        self,
        *,
        pena_id: int,
        current_roles: list[PenaRole],
        desired_labels: list[str],
        desired_colors: dict[str, str],
        renames: dict[str, str],
    ) -> list[PenaRole]:
        by_name = {item.name.casefold(): item for item in current_roles}
        renamed_snapshots: list[tuple[str, str]] = []
        for old_label, new_label in renames.items():
            role = by_name.get(old_label.casefold())
            if role is None:
                continue
            target = by_name.get(new_label.casefold())
            if target is not None and target is not role:
                # Renaming onto another existing role would silently merge them.
                self.session.rollback()
                raise InvalidPenaLabelsDataError()
            del by_name[old_label.casefold()]
            by_name[new_label.casefold()] = role
            renamed_snapshots.append((role.name, new_label))

        desired_keys = {label.casefold() for label in desired_labels}
        removed_roles = [role for key, role in by_name.items() if key not in desired_keys]
        affected = self._detach_removed_roles(pena_id=pena_id, removed_roles=removed_roles)

        synced_roles: list[PenaRole] = []
        for index, role_label in enumerate(desired_labels):
            role = by_name.get(role_label.casefold())
            color = desired_colors.get(
                role_label,
                default_color_for_label(role_label, defaults=DEFAULT_ROLE_LABEL_COLORS),
            )
            if role is None:
                role = PenaRole(
                    id_pena=pena_id,
                    name=role_label,
                    color=color,
                    sort_order=index,
                )
                self.session.add(role)
            else:
                role.name = role_label
                role.color = color
                role.sort_order = index
            synced_roles.append(role)

        # Ensure newly created roles have IDs before we reassign memberships.
        self.session.flush()

        for old_label, new_label in renamed_snapshots:
            self.session.execute(
                update(SeasonPlayer)
                .where(
                    SeasonPlayer.id_pena == pena_id,
                    func.lower(SeasonPlayer.role) == old_label.casefold(),
                )
                .values(role=new_label)
                .execution_options(synchronize_session=False)
            )

        self._assign_fallback_roles(pena_id=pena_id, roles=synced_roles, affected=affected)
        return sorted(synced_roles, key=lambda item: (item.sort_order, item.id or 0))

    def _detach_removed_roles(
        self,
        *,
        pena_id: int,
        removed_roles: list[PenaRole],
    ) -> _AffectedMemberships:
        """Unlink and delete removed roles, remembering which memberships used them."""
        affected = _AffectedMemberships()
        if not removed_roles:
            return affected
        removed_ids = [role.id for role in removed_roles if role.id is not None]
        removed_names = [role.name.casefold() for role in removed_roles]

        affected.pena_player_ids = list(
            self.session.execute(
                select(PenaPlayer.id).where(
                    PenaPlayer.id_pena == pena_id,
                    PenaPlayer.id_role.in_(removed_ids),
                )
            ).scalars()
        )
        affected.season_player_keys = [
            (int(row.id_player), int(row.id_season))
            for row in self.session.execute(
                select(SeasonPlayer.id_player, SeasonPlayer.id_season).where(
                    SeasonPlayer.id_pena == pena_id,
                    or_(
                        SeasonPlayer.id_role.in_(removed_ids),
                        func.lower(SeasonPlayer.role).in_(removed_names),
                    ),
                )
            )
        ]

        # Clear the FKs explicitly (do not rely on ON DELETE SET NULL) and drop the
        # roles BEFORE renaming/creating others, so a new or renamed role may reuse
        # the name of a removed one without hitting uq_pena_role_name.
        self.session.execute(
            update(PenaPlayer)
            .where(PenaPlayer.id.in_(affected.pena_player_ids))
            .values(id_role=None)
            .execution_options(synchronize_session=False)
        )
        self.session.execute(
            update(SeasonPlayer)
            .where(SeasonPlayer.id_pena == pena_id, SeasonPlayer.id_role.in_(removed_ids))
            .values(id_role=None)
            .execution_options(synchronize_session=False)
        )
        for role in removed_roles:
            self.session.delete(role)
        self.session.flush()
        return affected

    def _assign_fallback_roles(
        self,
        *,
        pena_id: int,
        roles: list[PenaRole],
        affected: _AffectedMemberships,
    ) -> None:
        if not affected.pena_player_ids and not affected.season_player_keys:
            return
        names = [role.name for role in roles]
        by_key = {role.name.casefold(): role for role in roles}
        with_account = select(Player.id).where(Player.id_player_account.is_not(None))
        for has_account in (True, False):
            fallback_name = default_role_label(names, has_account=has_account)
            fallback = by_key.get(fallback_name.casefold()) if fallback_name else None
            if fallback is None:
                continue
            pena_account_filter = (
                PenaPlayer.id_player.in_(with_account)
                if has_account
                else PenaPlayer.id_player.not_in(with_account)
            )
            self.session.execute(
                update(PenaPlayer)
                .where(PenaPlayer.id.in_(affected.pena_player_ids), pena_account_filter)
                .values(id_role=fallback.id)
                .execution_options(synchronize_session=False)
            )
            season_account_filter = (
                SeasonPlayer.id_player.in_(with_account)
                if has_account
                else SeasonPlayer.id_player.not_in(with_account)
            )
            for id_player, id_season in affected.season_player_keys:
                self.session.execute(
                    update(SeasonPlayer)
                    .where(
                        SeasonPlayer.id_pena == pena_id,
                        SeasonPlayer.id_player == id_player,
                        SeasonPlayer.id_season == id_season,
                        season_account_filter,
                    )
                    .values(id_role=fallback.id, role=fallback.name)
                    .execution_options(synchronize_session=False)
                )

    def _sync_player_positions(
        self,
        *,
        pena_id: int,
        previous_labels: list[str],
        desired_labels: list[str],
        renames: dict[str, str],
    ) -> None:
        """Propagate position renames and clear removed positions (policy: ``None``)."""
        for old_label, new_label in renames.items():
            for model in (PenaPlayer, SeasonPlayer):
                self.session.execute(
                    update(model)
                    .where(
                        model.id_pena == pena_id,
                        func.lower(model.position) == old_label.casefold(),
                    )
                    .values(position=new_label)
                    .execution_options(synchronize_session=False)
                )

        kept_keys = {label.casefold() for label in desired_labels}
        kept_keys.update(old_label.casefold() for old_label in renames)
        removed_keys = [
            label.casefold() for label in previous_labels if label.casefold() not in kept_keys
        ]
        if not removed_keys:
            return
        for model in (PenaPlayer, SeasonPlayer):
            self.session.execute(
                update(model)
                .where(
                    model.id_pena == pena_id,
                    func.lower(model.position).in_(removed_keys),
                )
                .values(position=None)
                .execution_options(synchronize_session=False)
            )
