from dataclasses import dataclass, field

from persistence.application.ports.season_competition_port import (
    MatchDetailResult,
    MatchPlayerStatsResult,
)


@dataclass
class MatchInsightsAccumulator:
    player_stats: dict[str, dict] = field(default_factory=dict)
    pair_stats: dict[str, dict] = field(default_factory=dict)
    teammate_graph: dict[str, dict[str, dict]] = field(default_factory=dict)
    seasons_in_report: set[str] = field(default_factory=set)
    season_aggregate_by_guid: dict[str, dict] = field(default_factory=dict)
    match_timeline_raw: list[dict] = field(default_factory=list)
    matches_analyzed: int = 0
    total_goals: int = 0
    total_assists: int = 0
    total_saves: int = 0
    total_lineup_entries: int = 0


class MatchInsightsReportBuilder:
    @classmethod
    def build(
        cls,
        match_details: list[MatchDetailResult],
        *,
        matrix_size: int,
        top_pairs_size: int,
        leaders_size: int,
    ) -> dict:
        state = MatchInsightsAccumulator()
        for detail in match_details:
            cls._accumulate_match(state, detail)

        players = cls._build_players(state.player_stats)
        player_labels = {
            guid: str(player.get("label") or guid) for guid, player in state.player_stats.items()
        }
        pair_rows = cls._build_pair_rows(state.pair_stats, player_labels)
        top_teammates_by_player = cls._build_top_teammates(
            players=players,
            teammate_graph=state.teammate_graph,
            player_labels=player_labels,
        )
        matrix_players = cls._build_matrix_players(players, matrix_size)

        return {
            "matches_analyzed": state.matches_analyzed,
            "seasons_analyzed": len(state.seasons_in_report),
            "total_goals": state.total_goals,
            "total_assists": state.total_assists,
            "total_saves": state.total_saves,
            "goals_per_match": cls._rate(state.total_goals, state.matches_analyzed),
            "assists_per_match": cls._rate(state.total_assists, state.matches_analyzed),
            "saves_per_match": cls._rate(state.total_saves, state.matches_analyzed),
            "average_players_per_team": cls._rate(
                state.total_lineup_entries,
                state.matches_analyzed * 2,
            ),
            "top_pairs": pair_rows[:top_pairs_size],
            "top_teammates_by_player": top_teammates_by_player,
            "matrix_players": matrix_players,
            "matrix_rows": cls._build_matrix_rows(matrix_players, state.pair_stats),
            "timeline_by_match": cls._build_match_timeline(state.match_timeline_raw),
            "timeline_by_season": cls._build_season_timeline(
                state.season_aggregate_by_guid,
            ),
            "leaders": {
                "scorers": cls._top_by_metric(players, "goals", leaders_size),
                "assisters": cls._top_by_metric(players, "assists", leaders_size),
                "savers": cls._top_by_metric(players, "saves", leaders_size),
            },
        }

    @classmethod
    def _accumulate_match(
        cls,
        state: MatchInsightsAccumulator,
        detail: MatchDetailResult,
    ) -> None:
        if not detail or str(detail.status or "").lower() != "closed":
            return

        state.matches_analyzed += 1
        season_guid = str(detail.season_guid or "unknown").strip() or "unknown"
        state.seasons_in_report.add(season_guid)

        home_score = cls._safe_int(detail.home_team.score)
        away_score = cls._safe_int(detail.away_team.score)
        match_goals = home_score + away_score
        state.total_goals += match_goals

        home_outcome = cls._match_outcome(home_score, away_score)
        away_outcome = cls._match_outcome(away_score, home_score)

        home_summary = cls._accumulate_team(
            state,
            detail.home_team.players,
            outcome=home_outcome,
        )
        away_summary = cls._accumulate_team(
            state,
            detail.away_team.players,
            outcome=away_outcome,
        )

        match_assists = home_summary["assists"] + away_summary["assists"]
        match_saves = home_summary["saves"] + away_summary["saves"]
        match_lineup_entries = home_summary["lineup_entries"] + away_summary["lineup_entries"]

        season_aggregate = cls._ensure_season_aggregate(state, season_guid)
        season_aggregate["matches"] += 1
        season_aggregate["goals"] += match_goals
        season_aggregate["assists"] += match_assists
        season_aggregate["saves"] += match_saves
        season_aggregate["lineup_entries"] += match_lineup_entries

        match_date = detail.match_date.isoformat()
        if (
            not season_aggregate["first_match_date"]
            or match_date < season_aggregate["first_match_date"]
        ):
            season_aggregate["first_match_date"] = match_date
        if (
            not season_aggregate["last_match_date"]
            or match_date > season_aggregate["last_match_date"]
        ):
            season_aggregate["last_match_date"] = match_date

        state.match_timeline_raw.append(
            {
                "season_guid": season_guid,
                "match_guid": str(detail.guid or ""),
                "match_date": match_date,
                "goals": match_goals,
                "assists": match_assists,
                "saves": match_saves,
                "average_players_per_team": cls._rate(match_lineup_entries, 2),
                "home_score": home_score,
                "away_score": away_score,
            }
        )

    @classmethod
    def _accumulate_team(
        cls,
        state: MatchInsightsAccumulator,
        players_raw: list[MatchPlayerStatsResult],
        *,
        outcome: str,
    ) -> dict:
        players = cls._normalize_match_players(players_raw)
        assists = 0
        saves = 0

        state.total_lineup_entries += len(players)
        for player in players:
            summary = cls._ensure_player(state, player)
            if not summary:
                continue

            player_assists = cls._safe_int(player.assists)
            player_saves = cls._safe_int(player.saves)

            summary["appearances"] += 1
            summary["goals"] += cls._safe_int(player.goals)
            summary["assists"] += player_assists
            summary["saves"] += player_saves
            cls._with_outcome(summary, outcome)

            state.total_assists += player_assists
            state.total_saves += player_saves
            assists += player_assists
            saves += player_saves

        cls._accumulate_team_pairs(state, players, outcome)
        return {
            "assists": assists,
            "saves": saves,
            "lineup_entries": len(players),
        }

    @classmethod
    def _accumulate_team_pairs(
        cls,
        state: MatchInsightsAccumulator,
        players: list[MatchPlayerStatsResult],
        outcome: str,
    ) -> None:
        for index, left_player in enumerate(players):
            left_guid = str(left_player.player_guid or "").strip()
            if not left_guid:
                continue
            for right_player in players[index + 1 :]:
                right_guid = str(right_player.player_guid or "").strip()
                if not right_guid:
                    continue

                pair = cls._ensure_pair(state, left_guid, right_guid)
                pair["matches"] += 1
                cls._with_outcome(pair, outcome)

                edge_forward = cls._ensure_edge(state, left_guid, right_guid)
                edge_forward["matches"] += 1
                cls._with_outcome(edge_forward, outcome)

                edge_backward = cls._ensure_edge(state, right_guid, left_guid)
                edge_backward["matches"] += 1
                cls._with_outcome(edge_backward, outcome)

    @classmethod
    def _build_players(cls, player_stats: dict[str, dict]) -> list[dict]:
        players = [
            {
                **player,
                "win_rate": cls._rate(player["wins"], player["appearances"]),
            }
            for player in player_stats.values()
        ]
        players.sort(key=lambda item: (-item["appearances"], -item["wins"]))
        return players

    @classmethod
    def _build_pair_rows(
        cls,
        pair_stats: dict[str, dict],
        player_labels: dict[str, str],
    ) -> list[dict]:
        pair_rows = []
        for pair in pair_stats.values():
            left_label = player_labels.get(pair["leftGuid"], pair["leftGuid"])
            right_label = player_labels.get(pair["rightGuid"], pair["rightGuid"])
            pair_rows.append(
                {
                    **pair,
                    "label": f"{left_label} + {right_label}",
                    "win_rate": cls._rate(pair["wins"], pair["matches"]),
                }
            )
        pair_rows.sort(key=lambda item: (-item["matches"], -item["wins"]))
        return pair_rows

    @classmethod
    def _build_top_teammates(
        cls,
        *,
        players: list[dict],
        teammate_graph: dict[str, dict[str, dict]],
        player_labels: dict[str, str],
    ) -> list[dict]:
        top_teammates_by_player = []
        for player in players:
            edges = teammate_graph.get(player["guid"]) or {}
            if not edges:
                continue

            best_partner_guid = None
            best_partner_stats = None
            for partner_guid, partner_stats in edges.items():
                if not best_partner_stats:
                    best_partner_guid = partner_guid
                    best_partner_stats = partner_stats
                    continue
                if partner_stats["matches"] > best_partner_stats["matches"] or (
                    partner_stats["matches"] == best_partner_stats["matches"]
                    and partner_stats["wins"] > best_partner_stats["wins"]
                ):
                    best_partner_guid = partner_guid
                    best_partner_stats = partner_stats
            if not best_partner_guid or not best_partner_stats:
                continue

            top_teammates_by_player.append(
                {
                    "player_guid": player["guid"],
                    "player_label": player_labels.get(player["guid"], player["guid"]),
                    "partner_guid": best_partner_guid,
                    "partner_label": player_labels.get(best_partner_guid, best_partner_guid),
                    "matches": best_partner_stats["matches"],
                    "wins": best_partner_stats["wins"],
                    "draws": best_partner_stats["draws"],
                    "losses": best_partner_stats["losses"],
                    "win_rate": cls._rate(
                        best_partner_stats["wins"],
                        best_partner_stats["matches"],
                    ),
                }
            )
        top_teammates_by_player.sort(key=lambda item: (-item["matches"], -item["wins"]))
        return top_teammates_by_player

    @staticmethod
    def _build_matrix_players(players: list[dict], matrix_size: int) -> list[dict]:
        return [
            {
                "guid": player["guid"],
                "label": player["label"],
                "appearances": player["appearances"],
            }
            for player in players[:matrix_size]
        ]

    @classmethod
    def _build_matrix_rows(
        cls,
        matrix_players: list[dict],
        pair_stats: dict[str, dict],
    ) -> list[dict]:
        matrix_rows = []
        for row_player in matrix_players:
            cells = []
            for column_player in matrix_players:
                if row_player["guid"] == column_player["guid"]:
                    cells.append(
                        cls._empty_matrix_cell(
                            row_player["guid"],
                            column_player["guid"],
                            same_player=True,
                        )
                    )
                    continue

                pair = pair_stats.get(
                    cls._pair_key(row_player["guid"], column_player["guid"]),
                )
                if not pair:
                    cells.append(
                        cls._empty_matrix_cell(
                            row_player["guid"],
                            column_player["guid"],
                            same_player=False,
                        )
                    )
                    continue
                cells.append(
                    {
                        "player_guid": row_player["guid"],
                        "teammate_guid": column_player["guid"],
                        "same_player": False,
                        "matches": pair["matches"],
                        "wins": pair["wins"],
                        "draws": pair["draws"],
                        "losses": pair["losses"],
                        "win_rate": cls._rate(pair["wins"], pair["matches"]),
                    }
                )
            matrix_rows.append({"player": row_player, "cells": cells})
        return matrix_rows

    @staticmethod
    def _empty_matrix_cell(
        player_guid: str,
        teammate_guid: str,
        *,
        same_player: bool,
    ) -> dict:
        return {
            "player_guid": player_guid,
            "teammate_guid": teammate_guid,
            "same_player": same_player,
            "matches": 0,
            "wins": 0,
            "draws": 0,
            "losses": 0,
            "win_rate": 0,
        }

    @classmethod
    def _build_match_timeline(cls, match_timeline_raw: list[dict]) -> list[dict]:
        timeline_by_match_sorted = sorted(
            match_timeline_raw,
            key=lambda item: item["match_guid"],
            reverse=True,
        )
        timeline_by_match_sorted.sort(key=lambda item: item["match_date"])

        timeline_by_match = []
        accumulated_goals = 0
        accumulated_assists = 0
        accumulated_saves = 0
        for index, point in enumerate(timeline_by_match_sorted, start=1):
            accumulated_goals += point["goals"]
            accumulated_assists += point["assists"]
            accumulated_saves += point["saves"]
            timeline_by_match.append(
                {
                    **point,
                    "match_index": index,
                    "label": f"M{index}",
                    "running_goals_per_match": cls._rate(accumulated_goals, index),
                    "running_assists_per_match": cls._rate(accumulated_assists, index),
                    "running_saves_per_match": cls._rate(accumulated_saves, index),
                }
            )
        return timeline_by_match

    @classmethod
    def _build_season_timeline(
        cls,
        season_aggregate_by_guid: dict[str, dict],
    ) -> list[dict]:
        timeline_by_season = sorted(
            season_aggregate_by_guid.values(),
            key=lambda item: (str(item["first_match_date"] or ""), item["season_guid"]),
        )
        return [
            {
                "season_guid": item["season_guid"],
                "matches": item["matches"],
                "goals_per_match": cls._rate(item["goals"], item["matches"]),
                "assists_per_match": cls._rate(item["assists"], item["matches"]),
                "saves_per_match": cls._rate(item["saves"], item["matches"]),
                "average_players_per_team": cls._rate(
                    item["lineup_entries"],
                    item["matches"] * 2,
                ),
            }
            for item in timeline_by_season
        ]

    @staticmethod
    def _ensure_season_aggregate(
        state: MatchInsightsAccumulator,
        season_guid: str,
    ) -> dict:
        key = str(season_guid or "unknown").strip() or "unknown"
        if key not in state.season_aggregate_by_guid:
            state.season_aggregate_by_guid[key] = {
                "season_guid": key,
                "matches": 0,
                "goals": 0,
                "assists": 0,
                "saves": 0,
                "lineup_entries": 0,
                "first_match_date": None,
                "last_match_date": None,
            }
        return state.season_aggregate_by_guid[key]

    @classmethod
    def _ensure_player(
        cls,
        state: MatchInsightsAccumulator,
        player: MatchPlayerStatsResult,
    ) -> dict | None:
        guid = str(player.player_guid or "").strip()
        if not guid:
            return None
        if guid not in state.player_stats:
            state.player_stats[guid] = {
                "guid": guid,
                "label": cls._format_match_player_name(player),
                "appearances": 0,
                "wins": 0,
                "draws": 0,
                "losses": 0,
                "goals": 0,
                "assists": 0,
                "saves": 0,
            }
        return state.player_stats[guid]

    @staticmethod
    def _ensure_pair(
        state: MatchInsightsAccumulator,
        left_guid: str,
        right_guid: str,
    ) -> dict:
        key = MatchInsightsReportBuilder._pair_key(left_guid, right_guid)
        if key not in state.pair_stats:
            left, right = (
                (left_guid, right_guid) if left_guid < right_guid else (right_guid, left_guid)
            )
            state.pair_stats[key] = {
                "leftGuid": left,
                "rightGuid": right,
                "matches": 0,
                "wins": 0,
                "draws": 0,
                "losses": 0,
            }
        return state.pair_stats[key]

    @staticmethod
    def _ensure_edge(
        state: MatchInsightsAccumulator,
        from_guid: str,
        to_guid: str,
    ) -> dict:
        if from_guid not in state.teammate_graph:
            state.teammate_graph[from_guid] = {}
        edges = state.teammate_graph[from_guid]
        if to_guid not in edges:
            edges[to_guid] = {
                "matches": 0,
                "wins": 0,
                "draws": 0,
                "losses": 0,
            }
        return edges[to_guid]

    @staticmethod
    def _match_outcome(scored: int, conceded: int) -> str:
        if scored > conceded:
            return "win"
        if scored < conceded:
            return "loss"
        return "draw"

    @staticmethod
    def _format_match_player_name(player: MatchPlayerStatsResult) -> str:
        full_name = " ".join(
            value for value in [player.name, player.surname1, player.surname2] if value
        ).strip()
        if player.nickname and full_name:
            return f"{player.nickname} ({full_name})"
        if player.nickname:
            return player.nickname
        return full_name or str(player.player_guid or "-")

    @staticmethod
    def _normalize_match_players(
        players: list[MatchPlayerStatsResult],
    ) -> list[MatchPlayerStatsResult]:
        seen: set[str] = set()
        normalized: list[MatchPlayerStatsResult] = []
        for player in players or []:
            guid = str(player.player_guid or "").strip()
            if not guid or guid in seen:
                continue
            seen.add(guid)
            normalized.append(player)
        return normalized

    @staticmethod
    def _pair_key(left_guid: str, right_guid: str) -> str:
        return (
            f"{left_guid}__{right_guid}" if left_guid < right_guid else f"{right_guid}__{left_guid}"
        )

    @staticmethod
    def _with_outcome(bucket: dict, outcome: str) -> None:
        if outcome == "win":
            bucket["wins"] += 1
            return
        if outcome == "loss":
            bucket["losses"] += 1
            return
        bucket["draws"] += 1

    @staticmethod
    def _rate(value: int | float, total: int | float) -> float:
        return float(value) / float(total) if total else 0.0

    @staticmethod
    def _safe_int(value: int | float | None) -> int:
        try:
            return int(value or 0)
        except (TypeError, ValueError):
            return 0

    @staticmethod
    def _top_by_metric(items: list[dict], metric: str, size: int) -> list[dict]:
        return sorted(
            items,
            key=lambda item: (-item.get(metric, 0), -item.get("appearances", 0)),
        )[:size]
