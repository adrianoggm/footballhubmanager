from dataclasses import dataclass


@dataclass(frozen=True)
class PenaLabelsInfo:
    role_labels: list[str]
    position_labels: list[str]
    role_colors: dict[str, str]
    position_colors: dict[str, str]


@dataclass(frozen=True)
class PenaLabelsUpdate:
    role_labels: list[str]
    position_labels: list[str]
    role_colors: dict[str, str] | None = None
    position_colors: dict[str, str] | None = None
