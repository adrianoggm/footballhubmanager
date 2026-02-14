from dataclasses import dataclass

import pytest
from persistence.application.ports.pena_link_repository import (
    PenaLinkTokenResult,
    PenaNotManagedByAdminError,
)
from persistence.application.use_cases.generate_pena_link_token import (
    GeneratePenaLinkTokenUseCase,
    PenaAccessDeniedError,
)


@dataclass
class _FakeRepo:
    should_raise_access_denied: bool = False
    last_payload: dict | None = None

    def create_token_for_admin_pena(self, *, admin_id: int, pena_guid: str, ttl_seconds: int):
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        self.last_payload = {
            "admin_id": admin_id,
            "pena_guid": pena_guid,
            "ttl_seconds": ttl_seconds,
        }
        return PenaLinkTokenResult(token="tok-1", pena_guid=pena_guid, expires_at=1700000000)


def test_generate_link_token_positive_returns_token_data():
    repo = _FakeRepo()
    use_case = GeneratePenaLinkTokenUseCase(repo)

    result = use_case.execute(admin_id=3, pena_guid="pena-guid", ttl_seconds=3600)

    assert result.token == "tok-1"
    assert result.pena_guid == "pena-guid"
    assert result.expires_at == 1700000000


def test_generate_link_token_negative_access_denied_maps_error():
    repo = _FakeRepo(should_raise_access_denied=True)
    use_case = GeneratePenaLinkTokenUseCase(repo)

    with pytest.raises(PenaAccessDeniedError):
        use_case.execute(admin_id=3, pena_guid="pena-guid", ttl_seconds=3600)


def test_generate_link_token_edge_small_ttl_forwarded():
    repo = _FakeRepo()
    use_case = GeneratePenaLinkTokenUseCase(repo)

    use_case.execute(admin_id=3, pena_guid="pena-guid", ttl_seconds=1)

    assert repo.last_payload is not None
    assert repo.last_payload["ttl_seconds"] == 1


def test_generate_link_token_edge_large_ttl_forwarded():
    repo = _FakeRepo()
    use_case = GeneratePenaLinkTokenUseCase(repo)

    use_case.execute(admin_id=3, pena_guid="pena-guid", ttl_seconds=10**9)

    assert repo.last_payload is not None
    assert repo.last_payload["ttl_seconds"] == 10**9
