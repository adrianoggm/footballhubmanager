import secrets
import time

from core.application.ports.pena_link_port import (
    ClaimRegistrationResult,
    ClaimTokenInfoResult,
    PenaLinkPort,
    PenaLinkTokenResult,
)
from core.domain.errors import (
    InvalidLinkTokenError,
    PenaLinkAccessDeniedError,
    PlayerAlreadyClaimedError,
    PlayerNotClaimableError,
    UserAlreadyLinkedError,
    UserProfileNotFoundError,
    UserUsernameExistsError,
)
from core.domain.label_config import DEFAULT_ROLE_LABELS, pick_preferred_label
from persistence.infrastructure.entity import (
    Pena,
    PenaLinkToken,
    PenaPlayer,
    PenaRole,
    Player,
    PlayerAccount,
)
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
            raise PenaLinkAccessDeniedError()

        token = secrets.token_urlsafe(32)
        expires_at = now_ts + ttl_seconds
        link = PenaLinkToken(token=token, id_pena=pena.id, expires_at=expires_at)
        self.session.add(link)
        self.session.commit()
        return PenaLinkTokenResult(token=token, pena_guid=pena_guid, expires_at=expires_at)

    def create_claim_token_for_admin(
        self, *, admin_id: int, pena_guid: str, player_guid: str, ttl_seconds: int
    ) -> PenaLinkTokenResult:
        now_ts = int(time.time())
        self.session.execute(delete(PenaLinkToken).where(PenaLinkToken.expires_at <= now_ts))

        pena = self.session.execute(
            select(Pena).where(Pena.guid == pena_guid, Pena.id_admin == admin_id)
        ).scalar_one_or_none()
        if not pena:
            self.session.rollback()
            raise PenaLinkAccessDeniedError()

        player = self.session.execute(
            select(Player).where(Player.guid == player_guid)
        ).scalar_one_or_none()
        membership = (
            self.session.execute(
                select(PenaPlayer.id).where(
                    PenaPlayer.id_player == player.id,
                    PenaPlayer.id_pena == pena.id,
                )
            ).first()
            if player
            else None
        )
        if not player or not membership:
            self.session.rollback()
            raise PlayerNotClaimableError()
        if player.id_player_account is not None:
            self.session.rollback()
            raise PlayerAlreadyClaimedError()

        token = secrets.token_urlsafe(32)
        expires_at = now_ts + ttl_seconds
        link = PenaLinkToken(
            token=token, id_pena=pena.id, id_player=player.id, expires_at=expires_at
        )
        self.session.add(link)
        self.session.commit()
        return PenaLinkTokenResult(
            token=token,
            pena_guid=pena_guid,
            expires_at=expires_at,
            player_guid=player_guid,
        )

    def inspect_claim_token(self, *, token: str) -> ClaimTokenInfoResult:
        now_ts = int(time.time())
        link = self.session.execute(
            select(PenaLinkToken).where(
                PenaLinkToken.token == token,
                PenaLinkToken.expires_at > now_ts,
                PenaLinkToken.id_player.is_not(None),
            )
        ).scalar_one_or_none()
        if not link:
            raise InvalidLinkTokenError()

        pena = self.session.execute(
            select(Pena.guid, Pena.name).where(Pena.id == link.id_pena)
        ).first()
        player = self.session.execute(
            select(Player.guid, Player.name).where(Player.id == link.id_player)
        ).first()
        if not pena or not player:
            raise InvalidLinkTokenError()

        nickname = self.session.execute(
            select(PenaPlayer.nickname).where(
                PenaPlayer.id_player == link.id_player,
                PenaPlayer.id_pena == link.id_pena,
            )
        ).scalar_one_or_none()

        return ClaimTokenInfoResult(
            pena_guid=pena.guid,
            pena_name=pena.name,
            player_guid=player.guid,
            player_name=player.name,
            player_nickname=nickname,
            expires_at=link.expires_at,
        )

    def register_and_claim_player(
        self, *, token: str, username: str, password_hash: str
    ) -> ClaimRegistrationResult:
        now_ts = int(time.time())
        self.session.execute(delete(PenaLinkToken).where(PenaLinkToken.expires_at <= now_ts))

        link = self.session.execute(
            select(PenaLinkToken)
            .where(
                PenaLinkToken.token == token,
                PenaLinkToken.expires_at > now_ts,
                PenaLinkToken.id_player.is_not(None),
            )
            .with_for_update()
        ).scalar_one_or_none()
        if not link:
            self.session.rollback()
            raise InvalidLinkTokenError()

        player = self.session.execute(
            select(Player).where(Player.id == link.id_player).with_for_update()
        ).scalar_one_or_none()
        if not player:
            self.session.rollback()
            raise InvalidLinkTokenError()
        if player.id_player_account is not None:
            # Stale token for an already-claimed player: consume it and reject.
            self.session.execute(delete(PenaLinkToken).where(PenaLinkToken.token == token))
            self.session.commit()
            raise PlayerAlreadyClaimedError()

        pena_guid = self.session.execute(
            select(Pena.guid).where(Pena.id == link.id_pena)
        ).scalar_one()

        try:
            account = PlayerAccount(
                username=username,
                password=password_hash,
                name=player.name,
            )
            self.session.add(account)
            self.session.flush()

            player.id_player_account = account.id
            self.session.execute(delete(PenaLinkToken).where(PenaLinkToken.token == token))
            self.session.flush()
            self.session.refresh(account)
            self.session.refresh(player)
        except IntegrityError as exc:
            # Username clash: keep the token valid so the invitee can retry.
            self.session.rollback()
            raise UserUsernameExistsError() from exc

        return ClaimRegistrationResult(
            account_id=account.id,
            account_guid=account.guid,
            player_guid=player.guid,
            pena_guid=pena_guid,
        )

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
                    raise InvalidLinkTokenError()

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
                    raise UserProfileNotFoundError()

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
        except (InvalidLinkTokenError, UserProfileNotFoundError):
            self.session.rollback()
            raise
        except IntegrityError as exc:
            self.session.rollback()
            # Best effort: ensure token is consumed even when membership insert raced.
            with self.session.begin():
                self.session.execute(delete(PenaLinkToken).where(PenaLinkToken.token == token))
            raise UserAlreadyLinkedError() from exc

        if already_linked:
            raise UserAlreadyLinkedError()
