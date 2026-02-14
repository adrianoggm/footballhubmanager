from typing import Protocol


class NationalityQueryRepository(Protocol):
    def list_names(self) -> list[str]: ...
