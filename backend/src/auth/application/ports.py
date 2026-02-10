from typing import Protocol

from auth.application.models import AuthAccount


class AuthAccountRepository(Protocol):
    def find_user_by_username(self, username: str) -> AuthAccount | None:
        ...

    def find_admin_by_username(self, username: str) -> AuthAccount | None:
        ...
