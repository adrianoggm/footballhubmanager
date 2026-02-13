from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from persistence.application.ports.registration_repository import (
    AdminRegistrationRepository,
    DuplicateUsernameError,
    InvalidNationalityError,
    RegisteredAdminResult,
    RegisteredUserResult,
    UserRegistrationRepository,
)
from persistence.domain.entity import AdminAccounts, Pena, Player, PlayerAccount


class SqlAlchemyRegistrationRepository(UserRegistrationRepository, AdminRegistrationRepository):
    def __init__(self, session: Session):
        self.session = session

    def register_user(
        self,
        *,
        username: str,
        password_hash: str,
        name: str,
        surname1: str,
        surname2: str | None,
        nationality: str,
    ) -> RegisteredUserResult:
        try:
            account = PlayerAccount(
                username=username,
                password=password_hash,
                name=name,
            )
            self.session.add(account)
            self.session.flush()

            player = Player(
                name=name,
                surname1=surname1,
                surname2=surname2,
                nationality=nationality,
                id_player_account=account.id,
            )
            self.session.add(player)
            self.session.commit()
            self.session.refresh(account)
            self.session.refresh(player)
            return RegisteredUserResult(
                account_id=account.id,
                account_guid=account.guid,
                player_guid=player.guid,
            )
        except IntegrityError as exc:
            self.session.rollback()
            if "fk_player_nationality" in str(exc.orig).lower():
                raise InvalidNationalityError() from exc
            raise DuplicateUsernameError() from exc

    def register_admin(
        self, *, username: str, password_hash: str, name: str
    ) -> RegisteredAdminResult:
        try:
            admin = AdminAccounts(
                username=username,
                password=password_hash,
                name=name,
            )
            self.session.add(admin)
            self.session.flush()

            # Business rule: each admin owns a default pena created at registration.
            pena = Pena(
                name=name,
                id_admin=admin.id,
            )
            self.session.add(pena)
            self.session.commit()
            self.session.refresh(admin)
            return RegisteredAdminResult(admin_id=admin.id, admin_guid=admin.guid)
        except IntegrityError as exc:
            self.session.rollback()
            raise DuplicateUsernameError() from exc
