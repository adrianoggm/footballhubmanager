from typing import Protocol

from persistence.application.ports.season_competition_port import MatchInsightRowResult


class SeasonMatchInsightsPort(Protocol):
    def list_closed_match_insight_rows(
        self,
        *,
        pena_guid: str,
        season_guids: list[str],
    ) -> list[MatchInsightRowResult]: ...
