from core.application.ports.pena_link_port import (
    InvalidOrExpiredLinkTokenError,
    PenaLinkPort,
    UserAlreadyLinkedToPenaError,
    UserPlayerNotFoundError,
)


class InvalidLinkTokenError(Exception):
    pass


class UserAlreadyLinkedError(Exception):
    pass


class UserProfileNotFoundError(Exception):
    pass


class LinkUserToPenaUseCase:
    def __init__(self, repository: PenaLinkPort):
        self.repository = repository

    def execute(
        self,
        *,
        token: str,
        account_id: int,
        nickname: str | None,
        position: str | None,
    ) -> None:
        normalized_token = token.strip()
        normalized_nickname = nickname.strip() if nickname is not None else None
        normalized_position = position.strip() if position is not None else None

        if not normalized_token:
            raise InvalidLinkTokenError()
        if normalized_nickname == "":
            normalized_nickname = None
        if normalized_position == "":
            normalized_position = None

        try:
            self.repository.consume_token_for_user(
                token=normalized_token,
                account_id=account_id,
                nickname=normalized_nickname,
                position=normalized_position,
            )
        except InvalidOrExpiredLinkTokenError as exc:
            raise InvalidLinkTokenError() from exc
        except UserAlreadyLinkedToPenaError as exc:
            raise UserAlreadyLinkedError() from exc
        except UserPlayerNotFoundError as exc:
            raise UserProfileNotFoundError() from exc
