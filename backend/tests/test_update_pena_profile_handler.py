import pytest
from core.application.commands.update_pena_profile_command import UpdatePenaProfileCommand
from core.application.commands.update_pena_profile_handler import UpdatePenaProfileHandler
from core.domain.errors import (
    InvalidProfileImageError,
    PenaProfileAccessDeniedError,
    PenaProfileNotFoundError,
)


class _Repo:
    def __init__(self):
        self.last_call = None
        self.error = None

    def update_for_admin(self, *, pena_guid: str, admin_id: int, image_url: str | None):
        if self.error:
            raise self.error
        self.last_call = {
            "pena_guid": pena_guid,
            "admin_id": admin_id,
            "image_url": image_url,
        }
        return type(
            "PenaProfileResult",
            (),
            {"guid": pena_guid, "name": "Pena Uno", "image_url": image_url},
        )()


def test_handler_updates_image():
    repo = _Repo()
    handler = UpdatePenaProfileHandler(repo)

    result = handler.handle(
        UpdatePenaProfileCommand(
            pena_guid="pena-1",
            admin_id=8,
            image_url="data:image/jpeg;base64,QQ==",
        )
    )

    assert result.guid == "pena-1"
    assert result.image_url == "data:image/jpeg;base64,QQ=="
    assert repo.last_call == {
        "pena_guid": "pena-1",
        "admin_id": 8,
        "image_url": "data:image/jpeg;base64,QQ==",
    }


def test_handler_rejects_invalid_image():
    repo = _Repo()
    handler = UpdatePenaProfileHandler(repo)

    with pytest.raises(InvalidProfileImageError):
        handler.handle(
            UpdatePenaProfileCommand(
                pena_guid="pena-1",
                admin_id=8,
                image_url="data:image/gif;base64,R0lGODlhAQABAIAAAAUEBA==",
            )
        )
    # La imagen inválida se rechaza en el Value Object, antes de tocar el repo.
    assert repo.last_call is None


def test_handler_propagates_not_found():
    repo = _Repo()
    repo.error = PenaProfileNotFoundError()
    handler = UpdatePenaProfileHandler(repo)

    with pytest.raises(PenaProfileNotFoundError):
        handler.handle(UpdatePenaProfileCommand(pena_guid="pena-1", admin_id=8, image_url=None))


def test_handler_propagates_access_denied():
    repo = _Repo()
    repo.error = PenaProfileAccessDeniedError()
    handler = UpdatePenaProfileHandler(repo)

    with pytest.raises(PenaProfileAccessDeniedError):
        handler.handle(UpdatePenaProfileCommand(pena_guid="pena-1", admin_id=8, image_url=None))
