from persistence.application.ports.nationality_query_repository import (
    NationalityQueryRepository,
)


class GetNationalitiesUseCase:
    def __init__(self, repository: NationalityQueryRepository):
        self.repository = repository

    def execute(self) -> list[str]:
        return self.repository.list_names()
