from persistence.application.ports.pena_query_repository import PenasPageResult, PenaSummary
from persistence.application.use_cases.get_penas import GetPenasUseCase


class _Repo:
    def __init__(self):
        self.last_admin_call = None
        self.last_user_call = None
        self.by_guid: dict[str, PenaSummary] = {}

    def find_for_admin(self, admin_id: int, *, page: int, page_size: int, search: str | None):
        self.last_admin_call = {
            "admin_id": admin_id,
            "page": page,
            "page_size": page_size,
            "search": search,
        }
        return PenasPageResult(
            items=[PenaSummary(guid="pena-a", name="Pena A")],
            page=page,
            page_size=page_size,
            total=1,
        )

    def find_for_user(self, account_id: int, *, page: int, page_size: int, search: str | None):
        self.last_user_call = {
            "account_id": account_id,
            "page": page,
            "page_size": page_size,
            "search": search,
        }
        return PenasPageResult(
            items=[PenaSummary(guid="pena-u", name="Pena U")],
            page=page,
            page_size=page_size,
            total=2,
        )

    def find_by_guid(self, pena_guid: str):
        return self.by_guid.get(pena_guid)


def test_get_penas_use_case_admin_and_user_pages():
    repo = _Repo()
    use_case = GetPenasUseCase(repo)

    admin_page = use_case.execute_for_admin(7, page=2, page_size=10, search="madrid")
    user_page = use_case.execute_for_user(8, page=1, page_size=5, search=None)

    assert admin_page.items[0].guid == "pena-a"
    assert admin_page.total == 1
    assert repo.last_admin_call == {"admin_id": 7, "page": 2, "page_size": 10, "search": "madrid"}

    assert user_page.items[0].guid == "pena-u"
    assert user_page.total == 2
    assert repo.last_user_call == {"account_id": 8, "page": 1, "page_size": 5, "search": None}


def test_get_penas_use_case_execute_by_guid_handles_found_and_missing():
    repo = _Repo()
    repo.by_guid["pena-1"] = PenaSummary(guid="pena-1", name="Pena One")
    use_case = GetPenasUseCase(repo)

    found = use_case.execute_by_guid("pena-1")
    missing = use_case.execute_by_guid("pena-missing")

    assert found is not None
    assert found.guid == "pena-1"
    assert found.name == "Pena One"
    assert missing is None
