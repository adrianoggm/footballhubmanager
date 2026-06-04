from dataclasses import dataclass, field

from core.application.models import MatchDetail, MatchPlayerStats


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
        match_details: list[MatchDetail],
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
        detail: MatchDetail,
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
        players_raw: list[MatchPlayerStats],
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
        players: list[MatchPlayerStats],
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
            best_partner = None
            for partner_guid, edge in edges.items():
                if best_partner is None or (
                    edge["matches"],
                    edge["wins"],
                ) > (
                    best_partner["matches"],
                    best_partner["wins"],
                ):
                    best_partner_guid = partner_guid
                    best_partner = edge

            if not best_partner_guid or not best_partner:
                continue

            top_teammates_by_player.append(
                {
                    "guid": player["guid"],
                    "label": player["label"],
                    "teammate_guid": best_partner_guid,
                    "teammate_label": player_labels.get(best_partner_guid, best_partner_guid),
                    "matches": best_partner["matches"],
                    "wins": best_partner["wins"],
                    "draws": best_partner["draws"],
                    "losses": best_partner["losses"],
                    "win_rate": cls._rate(best_partner["wins"], best_partner["matches"]),
                }
            )

        return top_teammates_by_player

    @classmethod
    def _build_matrix_players(cls, players: list[dict], matrix_size: int) -> list[dict]:
        return players[:matrix_size]

    @classmethod
    def _build_matrix_rows(
        cls,
        matrix_players: list[dict],
        pair_stats: dict[str, dict],
    ) -> list[dict]:
        rows = []
        for left in matrix_players:
            values = []
            for right in matrix_players:
                if left["guid"] == right["guid"]:
                    values.append(
                        {
                            "matches": left["appearances"],
                            "wins": left["wins"],
                            "draws": left["draws"],
                            "losses": left["losses"],
                            "win_rate": left["win_rate"],
                        }
                    )
                    continue

                pair = pair_stats.get(cls._pair_key(left["guid"], right["guid"])) or {
                    "matches": 0,
                    "wins": 0,
                    "draws": 0,
                    "losses": 0,
                }
                values.append(
                    {
                        "matches": pair["matches"],
                        "wins": pair["wins"],
                        "draws": pair["draws"],
                        "losses": pair["losses"],
                        "win_rate": cls._rate(pair["wins"], pair["matches"]),
                    }
                )
            rows.append(
                {
                    "guid": left["guid"],
                    "label": left["label"],
                    "values": values,
                }
            )
        return rows

    @classmethod
    def _build_match_timeline(cls, timeline_raw: list[dict]) -> list[dict]:
        ordered = sorted(
            timeline_raw,
            key=lambda item: (item["match_date"], item["match_guid"]),
        )
        return [
            {
                **item,
                "label": f"M{index}",
            }
            for index, item in enumerate(ordered, start=1)
        ]

    @classmethod
    def _build_season_timeline(
        cls,
        season_aggregate_by_guid: dict[str, dict],
    ) -> list[dict]:
        seasons = list(season_aggregate_by_guid.values())
        seasons.sort(
            key=lambda item: (
                item["first_match_date"] or "",
                item["season_guid"],
            )
        )
        return [
            {
                **season,
                "goals_per_match": cls._rate(season["goals"], season["matches"]),
                "assists_per_match": cls._rate(season["assists"], season["matches"]),
                "saves_per_match": cls._rate(season["saves"], season["matches"]),
                "average_players_per_team": cls._rate(
                    season["lineup_entries"],
                    season["matches"] * 2,
                ),
            }
            for season in seasons
        ]

    @classmethod
    def _top_by_metric(cls, players: list[dict], metric: str, size: int) -> list[dict]:
        ordered = sorted(
            players,
            key=lambda item: (-cls._safe_int(item.get(metric)), -item["appearances"]),
        )
        return ordered[:size]

    @staticmethod
    def _normalize_match_players(players_raw: list[MatchPlayerStats]) -> list[MatchPlayerStats]:
        players = []
        seen_guids: set[str] = set()
        for player in players_raw:
            guid = str(player.player_guid or "").strip()
            if not guid or guid in seen_guids:
                continue
            seen_guids.add(guid)
            players.append(player)
        return players

    @staticmethod
    def _ensure_player(state: MatchInsightsAccumulator, player: MatchPlayerStats) -> dict | None:
        guid = str(player.player_guid or "").strip()
        if not guid:
            return None
        if guid not in state.player_stats:
            label = MatchInsightsReportBuilder._player_label(
                player.name,
                player.surname1,
                player.player_guid,
                nickname=player.nickname,
            )
            state.player_stats[guid] = {
                "guid": guid,
                "label": label,
                "position": player.position,
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
            left, right = sorted((left_guid, right_guid))
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
        if to_guid not in state.teammate_graph[from_guid]:
            state.teammate_graph[from_guid][to_guid] = {
                "matches": 0,
                "wins": 0,
                "draws": 0,
                "losses": 0,
            }
        return state.teammate_graph[from_guid][to_guid]

    @staticmethod
    def _ensure_season_aggregate(
        state: MatchInsightsAccumulator,
        season_guid: str,
    ) -> dict:
        if season_guid not in state.season_aggregate_by_guid:
            state.season_aggregate_by_guid[season_guid] = {
                "season_guid": season_guid,
                "matches": 0,
                "goals": 0,
                "assists": 0,
                "saves": 0,
                "lineup_entries": 0,
                "first_match_date": None,
                "last_match_date": None,
            }
        return state.season_aggregate_by_guid[season_guid]

    @staticmethod
    def _with_outcome(summary: dict, outcome: str) -> None:
        if outcome == "win":
            summary["wins"] += 1
        elif outcome == "draw":
            summary["draws"] += 1
        else:
            summary["losses"] += 1

    @staticmethod
    def _match_outcome(scored: int, conceded: int) -> str:
        if scored > conceded:
            return "win"
        if scored < conceded:
            return "loss"
        return "draw"

    @staticmethod
    def _safe_int(value) -> int:
        try:
            return int(value)
        except (TypeError, ValueError):
            return 0

    @staticmethod
    def _player_label(
        name: str | None,
        surname1: str | None,
        fallback_guid: str,
        *,
        nickname: str | None = None,
    ) -> str:
        if nickname:
            return str(nickname).strip()
        full_name = " ".join(part.strip() for part in [name or "", surname1 or ""] if part.strip())
        return full_name or fallback_guid

    @staticmethod
    def _pair_key(left_guid: str, right_guid: str) -> str:
        left, right = sorted((str(left_guid), str(right_guid)))
        return f"{left}::{right}"

    @staticmethod
    def _rate(numerator: int | float, denominator: int | float) -> float:
        if not denominator:
            return 0.0
        return round(float(numerator) / float(denominator), 2)
