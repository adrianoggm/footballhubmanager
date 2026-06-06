import pytest
from core.application.models import (
    PenaProfileUpdate,
)
from core.application.ports.pena_profile_port import (
    PenaNotFoundError as RepositoryPenaNotFoundError,
)
from core.application.ports.pena_profile_port import (
    PenaNotManagedByAdminError as RepositoryPenaNotManagedByAdminError,
)
from core.application.use_cases.manage_pena_profile_usecase import (
    InvalidPenaProfileImageError,
    ManagePenaProfileUseCase,
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


def test_manage_pena_profile_updates_image():
    repo = _Repo()
    use_case = ManagePenaProfileUseCase(repo)

    result = use_case.update_for_admin(
        pena_guid="pena-1",
        admin_id=8,
        update=PenaProfileUpdate(image_url="data:image/jpeg;base64,QQ=="),
    )

    assert result.guid == "pena-1"
    assert result.image_url == "data:image/jpeg;base64,QQ=="
    assert repo.last_call == {
        "pena_guid": "pena-1",
        "admin_id": 8,
        "image_url": "data:image/jpeg;base64,QQ==",
    }


def test_manage_pena_profile_rejects_invalid_image():
    repo = _Repo()
    use_case = ManagePenaProfileUseCase(repo)

    with pytest.raises(InvalidPenaProfileImageError):
        use_case.update_for_admin(
            pena_guid="pena-1",
            admin_id=8,
            update=PenaProfileUpdate(image_url="data:image/gif;base64,R0lGODlhAQABAIAAAAUEBA=="),
        )


def test_manage_pena_profile_maps_not_found():
    repo = _Repo()
    repo.error = RepositoryPenaNotFoundError()
    use_case = ManagePenaProfileUseCase(repo)

    with pytest.raises(PenaProfileNotFoundError):
        use_case.update_for_admin(
            pena_guid="pena-1",
            admin_id=8,
            update=PenaProfileUpdate(image_url=None),
        )


def test_manage_pena_profile_maps_access_denied():
    repo = _Repo()
    repo.error = RepositoryPenaNotManagedByAdminError()
    use_case = ManagePenaProfileUseCase(repo)

    with pytest.raises(PenaProfileAccessDeniedError):
        use_case.update_for_admin(
            pena_guid="pena-1",
            admin_id=8,
            update=PenaProfileUpdate(image_url=None),
        )
