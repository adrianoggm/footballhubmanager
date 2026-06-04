from core.application.use_cases.get_nationalities_usecase import GetNationalitiesUseCase


class _Repo:
    def __init__(self):
        self.called = False

    def list_names(self):
        self.called = True
        return ["Spain", "France", "Italy"]


def test_get_nationalities_use_case_returns_repository_names():
    repo = _Repo()
    use_case = GetNationalitiesUseCase(repo)

    result = use_case.execute()

    assert repo.called is True
    assert result == ["Spain", "France", "Italy"]
