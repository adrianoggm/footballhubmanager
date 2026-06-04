from dataclasses import dataclass
from enum import Enum
from typing import Generic, TypeVar

T = TypeVar("T")


class UpdatePolicy(str, Enum):
    KEEP = "keep"
    SET = "set"


@dataclass(frozen=True)
class FieldUpdate(Generic[T]):
    policy: UpdatePolicy
    value: T | None = None

    @classmethod
    def keep(cls) -> "FieldUpdate[T]":
        return cls(policy=UpdatePolicy.KEEP)

    @classmethod
    def set(cls, value: T | None) -> "FieldUpdate[T]":
        return cls(policy=UpdatePolicy.SET, value=value)

    def is_set(self) -> bool:
        return self.policy is UpdatePolicy.SET


class StandingsUpdatePolicy(str, Enum):
    APPLY = "apply"
    SKIP = "skip"
