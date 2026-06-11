from core.application.ports.pena_labels_port import (
    PenaLabelsPort,
    PenaLabelsResult,
)
from core.domain.errors import (
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
    dump_label_colors_payload,
    dump_labels_payload,
    parse_label_colors_payload,
    parse_labels_payload,
    pick_preferred_label,
)
from persistence.infrastructure.entity import Pena, PenaPlayer, PenaRole
from sqlalchemy import select, update
from sqlalchemy.orm import Session


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
    ) -> PenaLabelsResult:
        pena = self._lock_pena(pena_guid)
        if pena.id_admin != admin_id:
            self.session.rollback()
            raise PenaLabelsAccessDeniedError()

        current_roles = self._lock_roles_for_pena(pena.id)
        updated_roles = self._sync_roles(
            pena_id=pena.id,
            current_roles=current_roles,
            desired_labels=role_labels,
            desired_colors=role_colors,
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
    ) -> list[PenaRole]:
        by_name = {item.name.casefold(): item for item in current_roles}
        synced_roles: list[PenaRole] = []

        for index, role_label in enumerate(desired_labels):
            key = role_label.casefold()
            role = by_name.pop(key, None)
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

        removed_role_ids = [item.id for item in by_name.values() if item.id is not None]
        if removed_role_ids:
            fallback_role = self._pick_fallback_role(synced_roles)
            if fallback_role and fallback_role.id is not None:
                self.session.execute(
                    update(PenaPlayer)
                    .where(
                        PenaPlayer.id_pena == pena_id,
                        PenaPlayer.id_role.in_(removed_role_ids),
                    )
                    .values(id_role=fallback_role.id)
                )
            for removed_role in by_name.values():
                self.session.delete(removed_role)

        return sorted(synced_roles, key=lambda item: (item.sort_order, item.id or 0))

    @staticmethod
    def _pick_fallback_role(roles: list[PenaRole]) -> PenaRole | None:
        if not roles:
            return None
        names = [item.name for item in roles]
        preferred = pick_preferred_label(names, "member") or names[0]
        preferred_key = preferred.casefold()
        for item in roles:
            if item.name.casefold() == preferred_key:
                return item
        return roles[0]
