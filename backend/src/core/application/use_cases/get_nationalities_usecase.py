from core.application.ports.nationality_query_port import NationalityQueryPort


class GetNationalitiesUseCase:
    def __init__(self, repository: NationalityQueryPort):
        self.repository = repository

    def execute(self) -> list[str]:
        return self.repository.list_names()
