import re

from auth.domain.errors import AccountEmailInUseError
from core.application.ports.registration_port import (
    AdminRegistrationPort,
    RegisteredAdminResult,
    RegisteredUserResult,
    UserRegistrationPort,
)
from core.domain.errors import (
    AdminUsernameExistsError,
    UserInvalidNationalityError,
    UserUsernameExistsError,
)
from core.domain.label_config import (
    DEFAULT_POSITION_LABEL_COLORS,
    DEFAULT_POSITION_LABELS,
    DEFAULT_ROLE_LABEL_COLORS,
    DEFAULT_ROLE_LABELS,
    align_label_colors,
    dump_label_colors_payload,
    dump_labels_payload,
)
from persistence.infrastructure.entity import AdminAccounts, Pena, PenaRole, Player, PlayerAccount
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

_VIOLATED_KEY_PATTERNS = (
    re.compile(r"for key '([^']+)'"),  # MySQL: ... for key 'player_account.uq_..._email'
    re.compile(r"unique constraint failed: (\S+)"),  # SQLite: ... failed: player_account.email
)


def _is_email_conflict(exc: IntegrityError) -> bool:
    # Inspect only the violated key name: the duplicated value (e.g. a username that
    # happens to contain "email") is also part of the message.
    message = str(exc.orig).lower()
    for pattern in _VIOLATED_KEY_PATTERNS:
        match = pattern.search(message)
        if match:
            return match.group(1).endswith("email")
    return False


class SqlAlchemyRegistrationRepository(UserRegistrationPort, AdminRegistrationPort):
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
        email: str,
    ) -> RegisteredUserResult:
        try:
            account = PlayerAccount(
                username=username,
                password=password_hash,
                name=name,
                email=email,
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
            self.session.flush()
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
                raise UserInvalidNationalityError() from exc
            if _is_email_conflict(exc):
                raise AccountEmailInUseError() from exc
            raise UserUsernameExistsError() from exc

    def register_admin(
        self, *, username: str, password_hash: str, name: str, email: str
    ) -> RegisteredAdminResult:
        try:
            admin = AdminAccounts(
                username=username,
                password=password_hash,
                name=name,
                email=email,
            )
            self.session.add(admin)
            self.session.flush()

            # Business rule: each admin owns a default pena created at registration.
            pena = Pena(
                name=name,
                position_labels=dump_labels_payload(list(DEFAULT_POSITION_LABELS)),
                position_label_colors=dump_label_colors_payload(
                    align_label_colors(
                        list(DEFAULT_POSITION_LABELS),
                        configured_colors=None,
                        defaults=DEFAULT_POSITION_LABEL_COLORS,
                    )
                ),
                id_admin=admin.id,
            )
            self.session.add(pena)
            self.session.flush()

            role_colors = align_label_colors(
                list(DEFAULT_ROLE_LABELS),
                configured_colors=None,
                defaults=DEFAULT_ROLE_LABEL_COLORS,
            )
            for index, role_name in enumerate(DEFAULT_ROLE_LABELS):
                self.session.add(
                    PenaRole(
                        id_pena=pena.id,
                        name=role_name,
                        color=role_colors.get(role_name),
                        sort_order=index,
                    )
                )

            self.session.flush()
            self.session.refresh(admin)
            return RegisteredAdminResult(admin_id=admin.id, admin_guid=admin.guid)
        except IntegrityError as exc:
            self.session.rollback()
            if _is_email_conflict(exc):
                raise AccountEmailInUseError() from exc
            raise AdminUsernameExistsError() from exc
