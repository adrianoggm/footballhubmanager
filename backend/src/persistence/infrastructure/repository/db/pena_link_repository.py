import secrets
import time

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from persistence.application.ports.pena_link_repository import (
    InvalidOrExpiredLinkTokenError,
    PenaLinkRepository,
    PenaLinkTokenResult,
    PenaNotManagedByAdminError,
    UserAlreadyLinkedToPenaError,
    UserPlayerNotFoundError,
)
from persistence.domain.entity import Pena, PenaLinkToken, PenaPlayer, Player


class SqlAlchemyPenaLinkRepository(PenaLinkRepository):
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
        self.session.execute(delete(PenaLinkToken).where(PenaLinkToken.expires_at <= now_ts))

        link = self.session.execute(
            select(PenaLinkToken)
            .where(PenaLinkToken.token == token, PenaLinkToken.expires_at > now_ts)
            .with_for_update()
        ).scalar_one_or_none()
        if not link:
            self.session.rollback()
            raise InvalidOrExpiredLinkTokenError()

        player = self.session.execute(
            select(Player).where(Player.id_player_account == account_id)
        ).scalar_one_or_none()
        if not player:
            self.session.rollback()
            raise UserPlayerNotFoundError()

        existing = self.session.execute(
            select(PenaPlayer.id).where(
                PenaPlayer.id_player == player.id,
                PenaPlayer.id_pena == link.id_pena,
            )
        ).first()
        if existing:
            self.session.execute(delete(PenaLinkToken).where(PenaLinkToken.token == token))
            self.session.commit()
            raise UserAlreadyLinkedToPenaError()

        try:
            membership = PenaPlayer(
                id_player=player.id,
                id_pena=link.id_pena,
                nickname=nickname,
                position=position,
            )
            self.session.add(membership)
            self.session.execute(delete(PenaLinkToken).where(PenaLinkToken.token == token))
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise UserAlreadyLinkedToPenaError() from exc
