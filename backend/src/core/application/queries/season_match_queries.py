from dataclasses import dataclass


@dataclass(frozen=True)
class ListSeasonMatchesQuery:
    pena_guid: str
    season_guid: str
    page: int = 1
    page_size: int = 20


@dataclass(frozen=True)
class GetSeasonMatchDetailQuery:
    pena_guid: str
    season_guid: str
    match_guid: str
