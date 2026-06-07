from typing import Protocol

from core.application.models import MatchInsightRow


class SeasonMatchInsightsPort(Protocol):
    def list_closed_match_insight_rows(
        self,
        *,
        pena_guid: str,
        season_guids: list[str],
    ) -> list[MatchInsightRow]: ...
