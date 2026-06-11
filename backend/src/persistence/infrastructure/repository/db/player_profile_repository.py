from core.application.ports.player_profile_port import (
    PenaInfoResult,
    PlayerProfilePort,
    PlayerProfileResult,
)
from core.application.services.profile_image_utils import (
    is_supported_profile_image_data_url,
)
from core.domain.errors import (
    InvalidPlayerNationalityError,
    InvalidProfileImageError,
)
from persistence.infrastructure.entity import Pena, PenaPlayer, Player
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session


class SqlAlchemyPlayerProfileRepository(PlayerProfilePort):
    def __init__(self, session: Session):
        self.session = session

    def find_by_guid(self, player_guid: str) -> PlayerProfileResult | None:
        player = self.session.execute(
            select(Player).where(Player.guid == player_guid)
        ).scalar_one_or_none()
        if not player:
            return None
        return self._build_profile(player)

    def find_by_account_id(self, account_id: int) -> PlayerProfileResult | None:
        player = self.session.execute(
            select(Player).where(Player.id_player_account == account_id)
        ).scalar_one_or_none()
        if not player:
            return None
        return self._build_profile(player)

    def update_by_guid(
        self,
        player_guid: str,
        *,
        name: str | None,
        surname1: str | None,
        surname2: str | None,
        nationality: str | None,
        image_url: str | None,
    ) -> PlayerProfileResult | None:
        player = self.session.query(Player).filter(Player.guid == player_guid).one_or_none()
        if not player:
            return None
        self._apply_update(
            player,
            name=name,
            surname1=surname1,
            surname2=surname2,
            nationality=nationality,
            image_url=image_url,
        )
        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            if "fk_player_nationality" in str(exc.orig).lower():
                raise InvalidPlayerNationalityError() from exc
            raise
        return self._build_profile(player)

    def update_by_account_id(
        self,
        account_id: int,
        *,
        name: str | None,
        surname1: str | None,
        surname2: str | None,
        nationality: str | None,
        image_url: str | None,
    ) -> PlayerProfileResult | None:
        player = (
            self.session.query(Player).filter(Player.id_player_account == account_id).one_or_none()
        )
        if not player:
            return None
        self._apply_update(
            player,
            name=name,
            surname1=surname1,
            surname2=surname2,
            nationality=nationality,
            image_url=image_url,
        )
        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            if "fk_player_nationality" in str(exc.orig).lower():
                raise InvalidPlayerNationalityError() from exc
            raise
        return self._build_profile(player)

    def _build_profile(self, player: Player) -> PlayerProfileResult:
        penas = (
            self.session.execute(
                select(Pena)
                .join(PenaPlayer, PenaPlayer.id_pena == Pena.id)
                .where(PenaPlayer.id_player == player.id)
                .order_by(Pena.name)
            )
            .scalars()
            .all()
        )
        return PlayerProfileResult(
            guid=player.guid,
            name=player.name,
            surname1=player.surname1,
            surname2=player.surname2,
            nationality=player.nationality,
            image_url=player.image_url,
            penas=[PenaInfoResult(guid=pena.guid, name=pena.name) for pena in penas],
        )

    @staticmethod
    def _apply_update(
        player: Player,
        *,
        name: str | None,
        surname1: str | None,
        surname2: str | None,
        nationality: str | None,
        image_url: str | None,
    ) -> None:
        if name is not None:
            player.name = name
        if surname1 is not None:
            player.surname1 = surname1
        if surname2 is not None:
            player.surname2 = surname2
        if nationality is not None:
            player.nationality = nationality
        if image_url is not None:
            if image_url and not is_supported_profile_image_data_url(image_url):
                raise InvalidProfileImageError()
            player.image_url = image_url or None
