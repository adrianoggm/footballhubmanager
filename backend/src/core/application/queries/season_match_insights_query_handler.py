"""Handler de la query de insights de partidos de temporada.

Traduce los errores de contrato del repositorio (``season_competition_port``)
a errores de dominio.
"""

from __future__ import annotations

from core.application.models import MatchDetail, MatchPlayerStats, MatchTeam
from core.application.ports.season_competition_port import (
    PenaNotFoundError as RepositoryPenaNotFoundError,
)
from core.application.ports.season_competition_port import (
    SeasonNotFoundError as RepositorySeasonNotFoundError,
)
from core.application.ports.season_match_insights_port import SeasonMatchInsightsPort
from core.application.queries.season_match_insights_query import GetSeasonMatchInsightsQuery
from core.application.services import MatchInsightsReportBuilder
from core.domain.errors import (
    InvalidSeasonInsightsDataError,
    PenaSeasonNotFoundError,
    PenaSeasonPenaNotFoundError,
)


def _normalize_insight_season_guids(season_guids: list[str]) -> list[str]:
    cleaned = [str(item or "").strip() for item in season_guids if str(item or "").strip()]
    if not cleaned:
        raise InvalidSeasonInsightsDataError()
    return list(dict.fromkeys(cleaned))


class GetSeasonMatchInsightsHandler:
    def __init__(self, repository: SeasonMatchInsightsPort) -> None:
        self._repository = repository

    def handle(self, query: GetSeasonMatchInsightsQuery) -> dict:
        cleaned_season_guids = _normalize_insight_season_guids(query.season_guids)
        if query.matrix_size < 2 or query.top_pairs_size < 1 or query.leaders_size < 1:
            raise InvalidSeasonInsightsDataError()

        details = self._collect_match_insight_details(
            pena_guid=query.pena_guid,
            season_guids=cleaned_season_guids,
        )
        report = MatchInsightsReportBuilder.build(
            details,
            matrix_size=query.matrix_size,
            top_pairs_size=query.top_pairs_size,
            leaders_size=query.leaders_size,
        )
        report["scope"] = query.scope
        report["season_guids"] = cleaned_season_guids
        return report

    def _collect_match_insight_details(
        self, *, pena_guid: str, season_guids: list[str]
    ) -> list[MatchDetail]:
        try:
            rows = self._repository.list_closed_match_insight_rows(
                pena_guid=pena_guid,
                season_guids=season_guids,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc

        matches_by_key: dict[str, dict] = {}
        for row in rows:
            if not row.match_guid:
                continue
            key = f"{row.season_guid}::{row.match_guid}"
            if key not in matches_by_key:
                matches_by_key[key] = {
                    "season_guid": row.season_guid,
                    "match_guid": row.match_guid,
                    "match_date": row.match_date,
                    "home_score": row.home_score,
                    "away_score": row.away_score,
                    "home_players": [],
                    "away_players": [],
                }

            try:
                rating = max(float(row.rating), 0.0)
            except (TypeError, ValueError):
                rating = 0.0
            player = MatchPlayerStats(
                player_guid=row.player_guid,
                name=row.player_name,
                surname1=row.player_surname1,
                surname2=row.player_surname2,
                nickname=row.player_nickname,
                position=row.player_position,
                goals=row.goals,
                assists=row.assists,
                saves=row.saves,
                rating=rating,
            )
            if row.team_side == "home":
                matches_by_key[key]["home_players"].append(player)
                continue
            if row.team_side == "away":
                matches_by_key[key]["away_players"].append(player)

        ordered_matches = sorted(
            matches_by_key.values(),
            key=lambda item: (item["match_date"], item["match_guid"]),
        )

        details: list[MatchDetail] = []
        for item in ordered_matches:
            if not item["home_players"] or not item["away_players"]:
                continue
            home_average_rating = MatchInsightsReportBuilder._rate(
                sum(player.rating for player in item["home_players"]),
                len(item["home_players"]),
            )
            away_average_rating = MatchInsightsReportBuilder._rate(
                sum(player.rating for player in item["away_players"]),
                len(item["away_players"]),
            )
            details.append(
                MatchDetail(
                    guid=item["match_guid"],
                    season_guid=item["season_guid"],
                    match_date=item["match_date"],
                    status="closed",
                    tracking_status="finished",
                    started_at_epoch=None,
                    ended_at_epoch=None,
                    elapsed_seconds=0,
                    home_team=MatchTeam(
                        team_guid=f"{item['match_guid']}:home",
                        team_name="Home",
                        score=item["home_score"],
                        total_assists=sum(player.assists for player in item["home_players"]),
                        total_saves=sum(player.saves for player in item["home_players"]),
                        average_rating=round(home_average_rating, 2),
                        players=item["home_players"],
                    ),
                    away_team=MatchTeam(
                        team_guid=f"{item['match_guid']}:away",
                        team_name="Away",
                        score=item["away_score"],
                        total_assists=sum(player.assists for player in item["away_players"]),
                        total_saves=sum(player.saves for player in item["away_players"]),
                        average_rating=round(away_average_rating, 2),
                        players=item["away_players"],
                    ),
                    events=[],
                )
            )
        return details
