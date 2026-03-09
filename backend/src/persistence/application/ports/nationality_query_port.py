from typing import Protocol


class NationalityQueryPort(Protocol):
    def list_names(self) -> list[str]: ...
