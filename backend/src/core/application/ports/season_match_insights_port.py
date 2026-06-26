from datetime import date
from typing import Protocol

from core.application.models import MatchInsightRow


class SeasonMatchInsightsPort(Protocol):
    def list_closed_match_insight_rows(
        self,
        *,
        pena_guid: str,
        season_guids: list[str],
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[MatchInsightRow]: ...

    def list_goal_event_seconds(
        self,
        *,
        pena_guid: str,
        season_guids: list[str],
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[int]: ...
