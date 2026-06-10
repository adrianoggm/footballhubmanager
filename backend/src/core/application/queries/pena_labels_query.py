from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class GetPenaLabelsQuery:
    pena_guid: str
