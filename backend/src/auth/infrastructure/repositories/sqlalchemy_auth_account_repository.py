from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.application.models import AuthAccount
from auth.application.ports import AuthAccountRepository
from persistence.domain.entity import AdminAccounts, PlayerAccount


class SqlAlchemyAuthAccountRepository(AuthAccountRepository):
    def __init__(self, session: Session):
        self.session = session

    def find_user_by_username(self, username: str) -> AuthAccount | None:
        user = self.session.execute(
            select(PlayerAccount).where(PlayerAccount.username == username)
        ).scalar_one_or_none()
        if not user:
            return None
        return AuthAccount(
            id=user.id,
            guid=user.guid,
            username=user.username,
            password_hash=user.password,
            user_type="user",
        )

    def find_admin_by_username(self, username: str) -> AuthAccount | None:
        admin = self.session.execute(
            select(AdminAccounts).where(AdminAccounts.username == username)
        ).scalar_one_or_none()
        if not admin:
            return None
        return AuthAccount(
            id=admin.id,
            guid=admin.guid,
            username=admin.username,
            password_hash=admin.password,
            user_type="admin",
        )
