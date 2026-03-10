from auth.application.ports import AccessRepository
from auth.session import SessionData


class InvalidSessionTypeError(Exception):
    pass


class AccessDeniedError(Exception):
    pass


class AuthorizePenaAccessUseCase:
    def __init__(self, repository: AccessRepository):
        self.repository = repository

    def execute(self, *, pena_guid: str, session: SessionData) -> None:
        if session.user_type == "admin":
            if self.repository.admin_manages_pena(admin_id=session.user_id, pena_guid=pena_guid):
                return
            raise AccessDeniedError("Admin does not manage this pena")

        if session.user_type == "user":
            if self.repository.user_belongs_to_pena(
                account_id=session.user_id, pena_guid=pena_guid
            ):
                return
            raise AccessDeniedError("User does not belong to this pena")

        raise InvalidSessionTypeError()


class AuthorizePlayerAccessUseCase:
    def __init__(self, repository: AccessRepository):
        self.repository = repository

    def execute(self, *, player_guid: str, session: SessionData) -> None:
        if session.user_type == "user":
            if self.repository.user_owns_player(
                account_id=session.user_id, player_guid=player_guid
            ):
                return
            raise AccessDeniedError("User cannot access this player")

        if session.user_type == "admin":
            if self.repository.admin_manages_player(
                admin_id=session.user_id, player_guid=player_guid
            ):
                return
            raise AccessDeniedError("Admin cannot access this player")

        raise InvalidSessionTypeError()
