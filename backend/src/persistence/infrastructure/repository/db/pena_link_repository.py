import secrets
import time

from core.application.ports.pena_link_port import (
    InvalidOrExpiredLinkTokenError,
    PenaLinkPort,
    PenaLinkTokenResult,
    PenaNotManagedByAdminError,
    UserAlreadyLinkedToPenaError,
    UserPlayerNotFoundError,
)
from core.domain.label_config import DEFAULT_ROLE_LABELS, pick_preferred_label
from persistence.infrastructure.entity import Pena, PenaLinkToken, PenaPlayer, PenaRole, Player
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session


class SqlAlchemyPenaLinkRepository(PenaLinkPort):
    def __init__(self, session: Session):
        self.session = session

    def create_token_for_admin_pena(
        self, *, admin_id: int, pena_guid: str, ttl_seconds: int
    ) -> PenaLinkTokenResult:
        now_ts = int(time.time())
        self.session.execute(delete(PenaLinkToken).where(PenaLinkToken.expires_at <= now_ts))

        pena = self.session.execute(
            select(Pena).where(Pena.guid == pena_guid, Pena.id_admin == admin_id)
        ).scalar_one_or_none()
        if not pena:
            self.session.rollback()
            raise PenaNotManagedByAdminError()

        token = secrets.token_urlsafe(32)
        expires_at = now_ts + ttl_seconds
        link = PenaLinkToken(token=token, id_pena=pena.id, expires_at=expires_at)
        self.session.add(link)
        self.session.commit()
        return PenaLinkTokenResult(token=token, pena_guid=pena_guid, expires_at=expires_at)

    def consume_token_for_user(
        self,
        *,
        token: str,
        account_id: int,
        nickname: str | None,
        position: str | None,
    ) -> None:
        now_ts = int(time.time())
        already_linked = False
        try:
            with self.session.begin():
                self.session.execute(
                    delete(PenaLinkToken).where(PenaLinkToken.expires_at <= now_ts)
                )

                link = self.session.execute(
                    select(PenaLinkToken)
                    .where(PenaLinkToken.token == token, PenaLinkToken.expires_at > now_ts)
                    .with_for_update()
                ).scalar_one_or_none()
                if not link:
                    raise InvalidOrExpiredLinkTokenError()

                roles = list(
                    self.session.execute(
                        select(PenaRole)
                        .where(PenaRole.id_pena == link.id_pena)
                        .order_by(PenaRole.sort_order.asc(), PenaRole.id.asc())
                    ).scalars()
                )
                role_options = [role.name for role in roles] or list(DEFAULT_ROLE_LABELS)
                default_role = pick_preferred_label(role_options, "member") or "member"
                default_role_id = next(
                    (role.id for role in roles if role.name.casefold() == default_role.casefold()),
                    roles[0].id if roles else None,
                )

                player = self.session.execute(
                    select(Player).where(Player.id_player_account == account_id)
                ).scalar_one_or_none()
                if not player:
                    raise UserPlayerNotFoundError()

                existing = self.session.execute(
                    select(PenaPlayer.id)
                    .where(
                        PenaPlayer.id_player == player.id,
                        PenaPlayer.id_pena == link.id_pena,
                    )
                    .with_for_update()
                ).first()
                self.session.execute(delete(PenaLinkToken).where(PenaLinkToken.token == token))
                if existing:
                    already_linked = True
                else:
                    membership = PenaPlayer(
                        id_player=player.id,
                        id_pena=link.id_pena,
                        nickname=nickname,
                        id_role=default_role_id,
                        position=position,
                    )
                    self.session.add(membership)
        except (InvalidOrExpiredLinkTokenError, UserPlayerNotFoundError):
            self.session.rollback()
            raise
        except IntegrityError as exc:
            self.session.rollback()
            # Best effort: ensure token is consumed even when membership insert raced.
            with self.session.begin():
                self.session.execute(delete(PenaLinkToken).where(PenaLinkToken.token == token))
            raise UserAlreadyLinkedToPenaError() from exc

        if already_linked:
            raise UserAlreadyLinkedToPenaError()
