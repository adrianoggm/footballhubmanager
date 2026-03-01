from dataclasses import dataclass
from datetime import date

from persistence.application.ports.season_competition_repository import (
    InvalidMatchDataError as RepositoryInvalidMatchDataError,
)
from persistence.application.ports.season_competition_repository import (
    InvalidSeasonDateRangeError as RepositoryInvalidSeasonDateRangeError,
)
from persistence.application.ports.season_competition_repository import (
    InvalidSeasonPlayerStatsError as RepositoryInvalidSeasonPlayerStatsError,
)
from persistence.application.ports.season_competition_repository import (
    MatchDetailResult,
    MatchInsightRowResult,
    MatchesPageResult,
    MatchPlayerStatsResult,
    MatchPlayerStatsUpdateData,
    MatchResult,
    MatchSummaryResult,
    MatchTeamResult,
    SeasonCompetitionRepository,
    SeasonPlayerFilters,
    SeasonPlayerResult,
    SeasonPlayersPageResult,
    SeasonResult,
)
from persistence.application.ports.season_competition_repository import (
    MatchLineupLockedError as RepositoryMatchLineupLockedError,
)
from persistence.application.ports.season_competition_repository import (
    MatchNotFoundError as RepositoryMatchNotFoundError,
)
from persistence.application.ports.season_competition_repository import (
    MatchPlayersNotInSeasonError as RepositoryMatchPlayersNotInSeasonError,
)
from persistence.application.ports.season_competition_repository import (
    MatchStatsMismatchError as RepositoryMatchStatsMismatchError,
)
from persistence.application.ports.season_competition_repository import (
    PenaNotFoundError as RepositoryPenaNotFoundError,
)
from persistence.application.ports.season_competition_repository import (
    PenaNotManagedByAdminError as RepositoryPenaNotManagedByAdminError,
)
from persistence.application.ports.season_competition_repository import (
    PlayerNotFoundError as RepositoryPlayerNotFoundError,
)
from persistence.application.ports.season_competition_repository import (
    PlayerNotInPenaError as RepositoryPlayerNotInPenaError,
)
from persistence.application.ports.season_competition_repository import (
    SamePlayerMatchError as RepositorySamePlayerMatchError,
)
from persistence.application.ports.season_competition_repository import (
    SeasonDateRangeOverlapError as RepositorySeasonDateRangeOverlapError,
)
from persistence.application.ports.season_competition_repository import (
    SeasonNotFoundError as RepositorySeasonNotFoundError,
)
from persistence.application.ports.season_competition_repository import (
    SeasonPlayerAlreadyRegisteredError as RepositorySeasonPlayerAlreadyRegisteredError,
)
from persistence.application.ports.season_competition_repository import (
    SeasonPlayerHasMatchesError as RepositorySeasonPlayerHasMatchesError,
)
from persistence.application.ports.season_competition_repository import (
    SeasonPlayerNotFoundError as RepositorySeasonPlayerNotFoundError,
)


@dataclass(frozen=True)
class SeasonInfo:
    guid: str
    start_date: date
    end_date: date
    points_win: int
    points_draw: int
    points_loss: int


@dataclass(frozen=True)
class SeasonPlayerInfo:
    player_guid: str
    name: str
    surname1: str
    surname2: str | None
    nationality: str
    nickname: str | None
    position: str | None
    played: int
    goals: int
    assists: int
    wins: int
    losses: int
    draws: int
    quality_level: float
    points: int


@dataclass(frozen=True)
class SeasonPlayersPage:
    items: list[SeasonPlayerInfo]
    page: int
    page_size: int
    total: int


@dataclass(frozen=True)
class SeasonCreate:
    start_date: date
    end_date: date
    points_win: int = 3
    points_draw: int = 1
    points_loss: int = 0


@dataclass(frozen=True)
class SeasonPlayerStatsUpdate:
    wins: int | None = None
    losses: int | None = None
    draws: int | None = None
    quality_level: float | None = None
    wins_provided: bool = False
    losses_provided: bool = False
    draws_provided: bool = False
    quality_level_provided: bool = False


@dataclass(frozen=True)
class SeasonMatchCreate:
    home_player_guid: str
    away_player_guid: str
    match_date: date


@dataclass(frozen=True)
class SeasonMatchTeamCreate:
    player_guids: list[str]
    team_name: str | None = None


@dataclass(frozen=True)
class SeasonMatchCreateDetailed:
    match_date: date
    home_team: SeasonMatchTeamCreate
    away_team: SeasonMatchTeamCreate


@dataclass(frozen=True)
class SeasonMatchUpdate:
    match_date: date | None = None
    home_team_name: str | None = None
    away_team_name: str | None = None
    match_date_provided: bool = False
    home_team_name_provided: bool = False
    away_team_name_provided: bool = False


@dataclass(frozen=True)
class SeasonMatchResultUpdate:
    home_score: int
    away_score: int
    update_standings: bool = True


@dataclass(frozen=True)
class SeasonMatchPlayerStatsUpdate:
    player_guid: str
    goals: int = 0
    assists: int = 0
    saves: int = 0
    rating: float = 0.0


@dataclass(frozen=True)
class SeasonMatchStatsUpdate:
    home_players: list[SeasonMatchPlayerStatsUpdate]
    away_players: list[SeasonMatchPlayerStatsUpdate]


@dataclass(frozen=True)
class SeasonMatchLineupsUpdate:
    home_player_guids: list[str]
    away_player_guids: list[str]


@dataclass(frozen=True)
class SeasonMatchInfo:
    guid: str
    season_guid: str
    match_date: date
    home_player_guid: str
    away_player_guid: str
    home_player_name: str
    away_player_name: str
    status: str
    home_score: int
    away_score: int


@dataclass(frozen=True)
class SeasonMatchPlayerStatsInfo:
    player_guid: str
    name: str
    surname1: str
    surname2: str | None
    nickname: str | None
    position: str | None
    goals: int
    assists: int
    saves: int
    rating: float


@dataclass(frozen=True)
class SeasonMatchTeamInfo:
    team_guid: str
    team_name: str
    score: int
    total_assists: int
    total_saves: int
    average_rating: float
    players: list[SeasonMatchPlayerStatsInfo]


@dataclass(frozen=True)
class SeasonMatchDetailInfo:
    guid: str
    season_guid: str
    match_date: date
    status: str
    home_team: SeasonMatchTeamInfo
    away_team: SeasonMatchTeamInfo


@dataclass(frozen=True)
class SeasonMatchSummaryInfo:
    guid: str
    season_guid: str
    match_date: date
    status: str
    home_team_name: str
    away_team_name: str
    home_score: int
    away_score: int
    home_players: int
    away_players: int


@dataclass(frozen=True)
class SeasonMatchesPage:
    items: list[SeasonMatchSummaryInfo]
    page: int
    page_size: int
    total: int


class InvalidSeasonDataError(Exception):
    pass


class PenaSeasonPenaNotFoundError(Exception):
    pass


class PenaSeasonAccessDeniedError(Exception):
    pass


class PenaSeasonNotFoundError(Exception):
    pass


class PenaSeasonDateOverlapError(Exception):
    pass


class SeasonPlayerNotFoundError(Exception):
    pass


class SeasonPlayerNotInPenaError(Exception):
    pass


class SeasonPlayerAlreadyRegisteredError(Exception):
    pass


class InvalidSeasonPlayerUpdateDataError(Exception):
    pass


class InvalidSeasonPlayerBatchDataError(Exception):
    pass


class SeasonMatchNotFoundError(Exception):
    pass


class SeasonMatchPlayersNotInSeasonError(Exception):
    pass


class SeasonMatchInvalidPlayersError(Exception):
    pass


class InvalidSeasonMatchDataError(Exception):
    pass


class SeasonMatchStatsMismatchError(Exception):
    pass


class SeasonMatchLineupLockedError(Exception):
    pass


class SeasonPlayerInMatchError(Exception):
    pass


class InvalidSeasonInsightsDataError(Exception):
    pass


class ManageSeasonCompetitionUseCase:
    def __init__(self, repository: SeasonCompetitionRepository):
        self.repository = repository

    def get_active_for_pena(
        self, *, pena_guid: str, reference_date: date | None = None
    ) -> SeasonInfo:
        effective_date = reference_date or date.today()
        try:
            season = self.repository.find_active_for_pena(
                pena_guid=pena_guid,
                reference_date=effective_date,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        if not season:
            raise PenaSeasonNotFoundError()
        return self._to_season_info(season)

    def create_season_for_admin(
        self, *, pena_guid: str, admin_id: int, data: SeasonCreate
    ) -> SeasonInfo:
        if data.start_date > data.end_date:
            raise InvalidSeasonDataError()
        try:
            created = self.repository.create_season_for_admin(
                pena_guid=pena_guid,
                admin_id=admin_id,
                start_date=data.start_date,
                end_date=data.end_date,
                points_win=data.points_win,
                points_draw=data.points_draw,
                points_loss=data.points_loss,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaSeasonAccessDeniedError() from exc
        except (
            RepositoryInvalidSeasonDateRangeError,
            RepositorySeasonDateRangeOverlapError,
        ) as exc:
            raise PenaSeasonDateOverlapError() from exc
        return self._to_season_info(created)

    def register_player_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        player_guid: str,
    ) -> SeasonPlayerInfo:
        try:
            registered = self.repository.register_player_for_admin(
                pena_guid=pena_guid,
                season_guid=season_guid,
                admin_id=admin_id,
                player_guid=player_guid,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaSeasonAccessDeniedError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc
        except RepositoryPlayerNotFoundError as exc:
            raise SeasonPlayerNotFoundError() from exc
        except RepositoryPlayerNotInPenaError as exc:
            raise SeasonPlayerNotInPenaError() from exc
        except RepositorySeasonPlayerAlreadyRegisteredError as exc:
            raise SeasonPlayerAlreadyRegisteredError() from exc
        return self._to_player_info(registered)

    def register_players_bulk_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        player_guids: list[str],
    ) -> list[SeasonPlayerInfo]:
        cleaned_guids = self._normalize_player_guids(player_guids)
        try:
            registered = self.repository.register_players_for_admin_bulk(
                pena_guid=pena_guid,
                season_guid=season_guid,
                admin_id=admin_id,
                player_guids=cleaned_guids,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaSeasonAccessDeniedError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc
        except RepositoryPlayerNotFoundError as exc:
            raise SeasonPlayerNotFoundError() from exc
        except RepositoryPlayerNotInPenaError as exc:
            raise SeasonPlayerNotInPenaError() from exc
        except RepositorySeasonPlayerAlreadyRegisteredError as exc:
            raise SeasonPlayerAlreadyRegisteredError() from exc
        except RepositoryInvalidMatchDataError as exc:
            raise InvalidSeasonPlayerBatchDataError() from exc
        return [self._to_player_info(item) for item in registered]

    def update_player_stats_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        player_guid: str,
        update: SeasonPlayerStatsUpdate,
    ) -> SeasonPlayerInfo:
        if not (
            update.wins_provided
            or update.losses_provided
            or update.draws_provided
            or update.quality_level_provided
        ):
            raise InvalidSeasonPlayerUpdateDataError()

        self._validate_stat_value(update.wins_provided, update.wins)
        self._validate_stat_value(update.losses_provided, update.losses)
        self._validate_stat_value(update.draws_provided, update.draws)
        self._validate_quality_value(update.quality_level_provided, update.quality_level)

        try:
            updated = self.repository.update_player_stats_for_admin(
                pena_guid=pena_guid,
                season_guid=season_guid,
                admin_id=admin_id,
                player_guid=player_guid,
                wins_provided=update.wins_provided,
                wins=update.wins,
                losses_provided=update.losses_provided,
                losses=update.losses,
                draws_provided=update.draws_provided,
                draws=update.draws,
                quality_level_provided=update.quality_level_provided,
                quality_level=update.quality_level,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaSeasonAccessDeniedError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc
        except (RepositoryPlayerNotFoundError, RepositorySeasonPlayerNotFoundError) as exc:
            raise SeasonPlayerNotFoundError() from exc
        except RepositoryInvalidSeasonPlayerStatsError as exc:
            raise InvalidSeasonPlayerUpdateDataError() from exc
        return self._to_player_info(updated)

    def unregister_player_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        player_guid: str,
    ) -> None:
        try:
            self.repository.unregister_player_for_admin(
                pena_guid=pena_guid,
                season_guid=season_guid,
                admin_id=admin_id,
                player_guid=player_guid,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaSeasonAccessDeniedError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc
        except (RepositoryPlayerNotFoundError, RepositorySeasonPlayerNotFoundError) as exc:
            raise SeasonPlayerNotFoundError() from exc
        except RepositorySeasonPlayerHasMatchesError as exc:
            raise SeasonPlayerInMatchError() from exc

    def list_season_players(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        filters: SeasonPlayerFilters,
        page: int = 1,
        page_size: int = 20,
        order_by: str = "quality_level",
        order_dir: str = "desc",
    ) -> SeasonPlayersPage:
        try:
            result = self.repository.list_season_players(
                pena_guid=pena_guid,
                season_guid=season_guid,
                filters=filters,
                page=page,
                page_size=page_size,
                order_by=order_by,
                order_dir=order_dir,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc
        return self._to_page(result)

    def create_match_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        data: SeasonMatchCreate,
    ) -> SeasonMatchInfo:
        if data.home_player_guid == data.away_player_guid:
            raise SeasonMatchInvalidPlayersError()
        try:
            created = self.repository.create_match_for_admin(
                pena_guid=pena_guid,
                season_guid=season_guid,
                admin_id=admin_id,
                home_player_guid=data.home_player_guid,
                away_player_guid=data.away_player_guid,
                match_date=data.match_date,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaSeasonAccessDeniedError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc
        except RepositorySamePlayerMatchError as exc:
            raise SeasonMatchInvalidPlayersError() from exc
        except RepositoryMatchPlayersNotInSeasonError as exc:
            raise SeasonMatchPlayersNotInSeasonError() from exc
        except RepositoryPlayerNotFoundError as exc:
            raise SeasonPlayerNotFoundError() from exc
        return self._to_match_info(created)

    def update_match_result_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
        update: SeasonMatchResultUpdate,
    ) -> SeasonMatchInfo:
        if update.home_score < 0 or update.away_score < 0:
            raise InvalidSeasonPlayerUpdateDataError()
        try:
            updated = self.repository.update_match_result_for_admin(
                pena_guid=pena_guid,
                season_guid=season_guid,
                match_guid=match_guid,
                admin_id=admin_id,
                home_score=update.home_score,
                away_score=update.away_score,
                update_standings=update.update_standings,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaSeasonAccessDeniedError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc
        except RepositoryMatchNotFoundError as exc:
            raise SeasonMatchNotFoundError() from exc
        except RepositoryInvalidSeasonPlayerStatsError as exc:
            raise InvalidSeasonPlayerUpdateDataError() from exc
        except RepositoryInvalidMatchDataError as exc:
            raise InvalidSeasonMatchDataError() from exc
        return self._to_match_info(updated)

    def create_match_with_lineups_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        data: SeasonMatchCreateDetailed,
    ) -> SeasonMatchDetailInfo:
        self._validate_team_lineup(data.home_team.player_guids)
        self._validate_team_lineup(data.away_team.player_guids)
        if set(data.home_team.player_guids).intersection(set(data.away_team.player_guids)):
            raise SeasonMatchInvalidPlayersError()

        try:
            created = self.repository.create_match_with_lineups_for_admin(
                pena_guid=pena_guid,
                season_guid=season_guid,
                admin_id=admin_id,
                match_date=data.match_date,
                home_team_name=self._clean_name(data.home_team.team_name),
                away_team_name=self._clean_name(data.away_team.team_name),
                home_player_guids=data.home_team.player_guids,
                away_player_guids=data.away_team.player_guids,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaSeasonAccessDeniedError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc
        except RepositorySamePlayerMatchError as exc:
            raise SeasonMatchInvalidPlayersError() from exc
        except RepositoryMatchPlayersNotInSeasonError as exc:
            raise SeasonMatchPlayersNotInSeasonError() from exc
        except RepositoryPlayerNotFoundError as exc:
            raise SeasonPlayerNotFoundError() from exc
        except RepositoryInvalidMatchDataError as exc:
            raise InvalidSeasonMatchDataError() from exc
        return self._to_match_detail(created)

    def update_match_stats_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
        update: SeasonMatchStatsUpdate,
    ) -> SeasonMatchDetailInfo:
        home_stats = self._normalize_player_stats(update.home_players)
        away_stats = self._normalize_player_stats(update.away_players)

        try:
            updated = self.repository.update_match_stats_for_admin(
                pena_guid=pena_guid,
                season_guid=season_guid,
                match_guid=match_guid,
                admin_id=admin_id,
                home_players_stats=home_stats,
                away_players_stats=away_stats,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaSeasonAccessDeniedError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc
        except RepositoryMatchNotFoundError as exc:
            raise SeasonMatchNotFoundError() from exc
        except RepositoryMatchStatsMismatchError as exc:
            raise SeasonMatchStatsMismatchError() from exc
        except (
            RepositoryInvalidMatchDataError,
            RepositoryInvalidSeasonPlayerStatsError,
        ) as exc:
            raise InvalidSeasonMatchDataError() from exc
        return self._to_match_detail(updated)

    def update_match_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
        update: SeasonMatchUpdate,
    ) -> SeasonMatchDetailInfo:
        if not (
            update.match_date_provided
            or update.home_team_name_provided
            or update.away_team_name_provided
        ):
            raise InvalidSeasonMatchDataError()

        home_team_name = self._clean_name(update.home_team_name)
        away_team_name = self._clean_name(update.away_team_name)
        if update.home_team_name_provided and home_team_name is None:
            raise InvalidSeasonMatchDataError()
        if update.away_team_name_provided and away_team_name is None:
            raise InvalidSeasonMatchDataError()
        if update.match_date_provided and update.match_date is None:
            raise InvalidSeasonMatchDataError()

        try:
            updated = self.repository.update_match_for_admin(
                pena_guid=pena_guid,
                season_guid=season_guid,
                match_guid=match_guid,
                admin_id=admin_id,
                match_date_provided=update.match_date_provided,
                match_date=update.match_date,
                home_team_name_provided=update.home_team_name_provided,
                home_team_name=home_team_name,
                away_team_name_provided=update.away_team_name_provided,
                away_team_name=away_team_name,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaSeasonAccessDeniedError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc
        except RepositoryMatchNotFoundError as exc:
            raise SeasonMatchNotFoundError() from exc
        except RepositoryInvalidMatchDataError as exc:
            raise InvalidSeasonMatchDataError() from exc
        return self._to_match_detail(updated)

    def update_match_lineups_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
        update: SeasonMatchLineupsUpdate,
    ) -> SeasonMatchDetailInfo:
        self._validate_team_lineup(update.home_player_guids)
        self._validate_team_lineup(update.away_player_guids)
        if set(update.home_player_guids).intersection(set(update.away_player_guids)):
            raise SeasonMatchInvalidPlayersError()

        try:
            updated = self.repository.update_match_lineups_for_admin(
                pena_guid=pena_guid,
                season_guid=season_guid,
                match_guid=match_guid,
                admin_id=admin_id,
                home_player_guids=update.home_player_guids,
                away_player_guids=update.away_player_guids,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaSeasonAccessDeniedError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc
        except RepositoryMatchNotFoundError as exc:
            raise SeasonMatchNotFoundError() from exc
        except RepositoryMatchLineupLockedError as exc:
            raise SeasonMatchLineupLockedError() from exc
        except RepositorySamePlayerMatchError as exc:
            raise SeasonMatchInvalidPlayersError() from exc
        except RepositoryMatchPlayersNotInSeasonError as exc:
            raise SeasonMatchPlayersNotInSeasonError() from exc
        except RepositoryPlayerNotFoundError as exc:
            raise SeasonPlayerNotFoundError() from exc
        except RepositoryInvalidMatchDataError as exc:
            raise InvalidSeasonMatchDataError() from exc
        return self._to_match_detail(updated)

    def delete_match_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
    ) -> None:
        try:
            self.repository.delete_match_for_admin(
                pena_guid=pena_guid,
                season_guid=season_guid,
                match_guid=match_guid,
                admin_id=admin_id,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaSeasonAccessDeniedError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc
        except RepositoryMatchNotFoundError as exc:
            raise SeasonMatchNotFoundError() from exc
        except RepositoryInvalidMatchDataError as exc:
            raise InvalidSeasonMatchDataError() from exc

    def get_match_insights(
        self,
        *,
        pena_guid: str,
        season_guids: list[str],
        scope: str | None = None,
        matrix_size: int = 8,
        top_pairs_size: int = 10,
        leaders_size: int = 5,
    ) -> dict:
        cleaned_season_guids = self._normalize_insight_season_guids(season_guids)
        if matrix_size < 2 or top_pairs_size < 1 or leaders_size < 1:
            raise InvalidSeasonInsightsDataError()

        details = self._collect_match_insight_details(
            pena_guid=pena_guid,
            season_guids=cleaned_season_guids,
        )
        report = self._build_match_insights_report(
            details,
            matrix_size=matrix_size,
            top_pairs_size=top_pairs_size,
            leaders_size=leaders_size,
        )
        report["scope"] = scope
        report["season_guids"] = cleaned_season_guids
        return report

    def list_season_matches(
        self, *, pena_guid: str, season_guid: str, page: int = 1, page_size: int = 20
    ) -> SeasonMatchesPage:
        try:
            result = self.repository.list_season_matches(
                pena_guid=pena_guid,
                season_guid=season_guid,
                page=page,
                page_size=page_size,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc
        return self._to_matches_page(result)

    def get_match_detail(
        self, *, pena_guid: str, season_guid: str, match_guid: str
    ) -> SeasonMatchDetailInfo:
        try:
            result = self.repository.get_match_detail(
                pena_guid=pena_guid,
                season_guid=season_guid,
                match_guid=match_guid,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc
        except RepositoryMatchNotFoundError as exc:
            raise SeasonMatchNotFoundError() from exc
        return self._to_match_detail(result)

    def get_standings(
        self, *, pena_guid: str, season_guid: str, page: int = 1, page_size: int = 20
    ) -> SeasonPlayersPage:
        try:
            result = self.repository.get_standings(
                pena_guid=pena_guid,
                season_guid=season_guid,
                page=page,
                page_size=page_size,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc
        return self._to_page(result)

    def _collect_match_insight_details(
        self, *, pena_guid: str, season_guids: list[str]
    ) -> list[MatchDetailResult]:
        try:
            rows = self.repository.list_closed_match_insight_rows(
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

            player = MatchPlayerStatsResult(
                player_guid=row.player_guid,
                name=row.player_name,
                surname1=row.player_surname1,
                surname2=row.player_surname2,
                nickname=row.player_nickname,
                position=None,
                goals=row.goals,
                assists=row.assists,
                saves=row.saves,
                rating=0.0,
            )
            if row.team_side == "home":
                matches_by_key[key]["home_players"].append(player)
                continue
            if row.team_side == "away":
                matches_by_key[key]["away_players"].append(player)

        ordered_matches = sorted(
            matches_by_key.values(),
            key=lambda item: (
                item["match_date"],
                item["match_guid"],
            ),
        )

        details: list[MatchDetailResult] = []
        for item in ordered_matches:
            if not item["home_players"] or not item["away_players"]:
                continue
            details.append(
                MatchDetailResult(
                    guid=item["match_guid"],
                    season_guid=item["season_guid"],
                    match_date=item["match_date"],
                    status="closed",
                    home_team=MatchTeamResult(
                        team_guid=f"{item['match_guid']}:home",
                        team_name="Home",
                        score=item["home_score"],
                        total_assists=sum(player.assists for player in item["home_players"]),
                        total_saves=sum(player.saves for player in item["home_players"]),
                        average_rating=0.0,
                        players=item["home_players"],
                    ),
                    away_team=MatchTeamResult(
                        team_guid=f"{item['match_guid']}:away",
                        team_name="Away",
                        score=item["away_score"],
                        total_assists=sum(player.assists for player in item["away_players"]),
                        total_saves=sum(player.saves for player in item["away_players"]),
                        average_rating=0.0,
                        players=item["away_players"],
                    ),
                )
            )
        return details

    @classmethod
    def _build_match_insights_report(
        cls,
        match_details: list[MatchDetailResult],
        *,
        matrix_size: int,
        top_pairs_size: int,
        leaders_size: int,
    ) -> dict:
        player_stats: dict[str, dict] = {}
        pair_stats: dict[str, dict] = {}
        teammate_graph: dict[str, dict[str, dict]] = {}
        seasons_in_report: set[str] = set()
        season_aggregate_by_guid: dict[str, dict] = {}
        match_timeline_raw: list[dict] = []

        matches_analyzed = 0
        total_goals = 0
        total_assists = 0
        total_saves = 0
        total_lineup_entries = 0

        def ensure_season_aggregate(season_guid: str) -> dict:
            key = str(season_guid or "unknown").strip() or "unknown"
            if key not in season_aggregate_by_guid:
                season_aggregate_by_guid[key] = {
                    "season_guid": key,
                    "matches": 0,
                    "goals": 0,
                    "assists": 0,
                    "saves": 0,
                    "lineup_entries": 0,
                    "first_match_date": None,
                    "last_match_date": None,
                }
            return season_aggregate_by_guid[key]

        def ensure_player(player: MatchPlayerStatsResult) -> dict | None:
            guid = str(player.player_guid or "").strip()
            if not guid:
                return None
            if guid not in player_stats:
                player_stats[guid] = {
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
            return player_stats[guid]

        def ensure_pair(left_guid: str, right_guid: str) -> dict:
            key = cls._pair_key(left_guid, right_guid)
            if key not in pair_stats:
                left, right = (
                    (left_guid, right_guid) if left_guid < right_guid else (right_guid, left_guid)
                )
                pair_stats[key] = {
                    "leftGuid": left,
                    "rightGuid": right,
                    "matches": 0,
                    "wins": 0,
                    "draws": 0,
                    "losses": 0,
                }
            return pair_stats[key]

        def ensure_edge(from_guid: str, to_guid: str) -> dict:
            if from_guid not in teammate_graph:
                teammate_graph[from_guid] = {}
            edges = teammate_graph[from_guid]
            if to_guid not in edges:
                edges[to_guid] = {
                    "matches": 0,
                    "wins": 0,
                    "draws": 0,
                    "losses": 0,
                }
            return edges[to_guid]

        for detail in match_details:
            if not detail or str(detail.status or "").lower() != "closed":
                continue
            matches_analyzed += 1

            season_guid = str(detail.season_guid or "unknown").strip() or "unknown"
            seasons_in_report.add(season_guid)

            home_score = cls._safe_int(detail.home_team.score)
            away_score = cls._safe_int(detail.away_team.score)
            match_goals = home_score + away_score
            total_goals += match_goals

            match_assists = 0
            match_saves = 0
            match_lineup_entries = 0

            outcome_home = (
                "win" if home_score > away_score else "loss" if home_score < away_score else "draw"
            )
            outcome_away = (
                "win" if away_score > home_score else "loss" if away_score < home_score else "draw"
            )

            team_entries = [
                (detail.home_team.players, outcome_home),
                (detail.away_team.players, outcome_away),
            ]

            for players_raw, outcome in team_entries:
                players = cls._normalize_match_players(players_raw)
                total_lineup_entries += len(players)
                match_lineup_entries += len(players)

                for player in players:
                    summary = ensure_player(player)
                    if not summary:
                        continue
                    assists = cls._safe_int(player.assists)
                    saves = cls._safe_int(player.saves)

                    summary["appearances"] += 1
                    summary["goals"] += cls._safe_int(player.goals)
                    summary["assists"] += assists
                    summary["saves"] += saves
                    cls._with_outcome(summary, outcome)

                    total_assists += assists
                    total_saves += saves
                    match_assists += assists
                    match_saves += saves

                for index, left_player in enumerate(players):
                    left_guid = str(left_player.player_guid or "").strip()
                    if not left_guid:
                        continue
                    for right_player in players[index + 1 :]:
                        right_guid = str(right_player.player_guid or "").strip()
                        if not right_guid:
                            continue

                        pair = ensure_pair(left_guid, right_guid)
                        pair["matches"] += 1
                        cls._with_outcome(pair, outcome)

                        edge_forward = ensure_edge(left_guid, right_guid)
                        edge_forward["matches"] += 1
                        cls._with_outcome(edge_forward, outcome)

                        edge_backward = ensure_edge(right_guid, left_guid)
                        edge_backward["matches"] += 1
                        cls._with_outcome(edge_backward, outcome)

            season_aggregate = ensure_season_aggregate(season_guid)
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

            match_timeline_raw.append(
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

        players = []
        for player in player_stats.values():
            players.append(
                {
                    **player,
                    "win_rate": cls._rate(player["wins"], player["appearances"]),
                }
            )
        players.sort(key=lambda item: (-item["appearances"], -item["wins"]))

        pair_rows = []
        for pair in pair_stats.values():
            left_player = player_stats.get(pair["leftGuid"])
            right_player = player_stats.get(pair["rightGuid"])
            pair_rows.append(
                {
                    **pair,
                    "label": f"{left_player['label'] if left_player else pair['leftGuid']} + "
                    f"{right_player['label'] if right_player else pair['rightGuid']}",
                    "win_rate": cls._rate(pair["wins"], pair["matches"]),
                }
            )
        pair_rows.sort(key=lambda item: (-item["matches"], -item["wins"]))
        top_pairs = pair_rows[:top_pairs_size]

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
            partner = player_stats.get(best_partner_guid)
            top_teammates_by_player.append(
                {
                    "player_guid": player["guid"],
                    "player_label": player["label"],
                    "partner_guid": best_partner_guid,
                    "partner_label": partner["label"] if partner else best_partner_guid,
                    "matches": best_partner_stats["matches"],
                    "wins": best_partner_stats["wins"],
                    "draws": best_partner_stats["draws"],
                    "losses": best_partner_stats["losses"],
                    "win_rate": cls._rate(
                        best_partner_stats["wins"], best_partner_stats["matches"]
                    ),
                }
            )
        top_teammates_by_player.sort(key=lambda item: (-item["matches"], -item["wins"]))

        matrix_players = [
            {
                "guid": player["guid"],
                "label": player["label"],
                "appearances": player["appearances"],
            }
            for player in players[:matrix_size]
        ]

        matrix_rows = []
        for row_player in matrix_players:
            cells = []
            for column_player in matrix_players:
                if row_player["guid"] == column_player["guid"]:
                    cells.append(
                        {
                            "player_guid": row_player["guid"],
                            "teammate_guid": column_player["guid"],
                            "same_player": True,
                            "matches": 0,
                            "wins": 0,
                            "draws": 0,
                            "losses": 0,
                            "win_rate": 0,
                        }
                    )
                    continue

                pair = pair_stats.get(cls._pair_key(row_player["guid"], column_player["guid"]))
                if not pair:
                    cells.append(
                        {
                            "player_guid": row_player["guid"],
                            "teammate_guid": column_player["guid"],
                            "same_player": False,
                            "matches": 0,
                            "wins": 0,
                            "draws": 0,
                            "losses": 0,
                            "win_rate": 0,
                        }
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

        timeline_by_season = sorted(
            season_aggregate_by_guid.values(),
            key=lambda item: (str(item["first_match_date"] or ""), item["season_guid"]),
        )
        timeline_by_season = [
            {
                "season_guid": item["season_guid"],
                "matches": item["matches"],
                "goals_per_match": cls._rate(item["goals"], item["matches"]),
                "assists_per_match": cls._rate(item["assists"], item["matches"]),
                "saves_per_match": cls._rate(item["saves"], item["matches"]),
                "average_players_per_team": cls._rate(item["lineup_entries"], item["matches"] * 2),
            }
            for item in timeline_by_season
        ]

        return {
            "matches_analyzed": matches_analyzed,
            "seasons_analyzed": len(seasons_in_report),
            "total_goals": total_goals,
            "total_assists": total_assists,
            "total_saves": total_saves,
            "goals_per_match": cls._rate(total_goals, matches_analyzed),
            "assists_per_match": cls._rate(total_assists, matches_analyzed),
            "saves_per_match": cls._rate(total_saves, matches_analyzed),
            "average_players_per_team": cls._rate(total_lineup_entries, matches_analyzed * 2),
            "top_pairs": top_pairs,
            "top_teammates_by_player": top_teammates_by_player,
            "matrix_players": matrix_players,
            "matrix_rows": matrix_rows,
            "timeline_by_match": timeline_by_match,
            "timeline_by_season": timeline_by_season,
            "leaders": {
                "scorers": cls._top_by_metric(players, "goals", leaders_size),
                "assisters": cls._top_by_metric(players, "assists", leaders_size),
                "savers": cls._top_by_metric(players, "saves", leaders_size),
            },
        }

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
    def _normalize_insight_season_guids(season_guids: list[str]) -> list[str]:
        cleaned = [str(item or "").strip() for item in season_guids if str(item or "").strip()]
        if not cleaned:
            raise InvalidSeasonInsightsDataError()
        unique_cleaned = list(dict.fromkeys(cleaned))
        return unique_cleaned

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

    @staticmethod
    def _validate_stat_value(is_provided: bool, value: int | None) -> None:
        if not is_provided:
            return
        if value is None or value < 0:
            raise InvalidSeasonPlayerUpdateDataError()

    @staticmethod
    def _validate_quality_value(is_provided: bool, value: float | None) -> None:
        if not is_provided:
            return
        if value is None or value < 0:
            raise InvalidSeasonPlayerUpdateDataError()

    @staticmethod
    def _validate_team_lineup(player_guids: list[str]) -> None:
        if not player_guids:
            raise InvalidSeasonMatchDataError()
        cleaned = [item.strip() for item in player_guids if item.strip()]
        if len(cleaned) != len(player_guids):
            raise InvalidSeasonMatchDataError()
        if len(set(cleaned)) != len(cleaned):
            raise SeasonMatchInvalidPlayersError()

    @staticmethod
    def _clean_name(value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @staticmethod
    def _normalize_player_guids(player_guids: list[str]) -> list[str]:
        if not player_guids:
            raise InvalidSeasonPlayerBatchDataError()
        cleaned_guids = [player_guid.strip() for player_guid in player_guids if player_guid.strip()]
        if len(cleaned_guids) != len(player_guids):
            raise InvalidSeasonPlayerBatchDataError()
        if len(set(cleaned_guids)) != len(cleaned_guids):
            raise InvalidSeasonPlayerBatchDataError()
        return cleaned_guids

    @staticmethod
    def _normalize_player_stats(
        values: list[SeasonMatchPlayerStatsUpdate],
    ) -> list[MatchPlayerStatsUpdateData]:
        if not values:
            raise InvalidSeasonMatchDataError()
        result: list[MatchPlayerStatsUpdateData] = []
        seen_guids: set[str] = set()
        for item in values:
            player_guid = item.player_guid.strip()
            if not player_guid:
                raise InvalidSeasonMatchDataError()
            if player_guid in seen_guids:
                raise InvalidSeasonMatchDataError()
            if item.goals < 0 or item.assists < 0 or item.saves < 0 or item.rating < 0:
                raise InvalidSeasonMatchDataError()
            seen_guids.add(player_guid)
            result.append(
                MatchPlayerStatsUpdateData(
                    player_guid=player_guid,
                    goals=item.goals,
                    assists=item.assists,
                    saves=item.saves,
                    rating=item.rating,
                )
            )
        return result

    @staticmethod
    def _to_season_info(item: SeasonResult) -> SeasonInfo:
        return SeasonInfo(
            guid=item.guid,
            start_date=item.start_date,
            end_date=item.end_date,
            points_win=item.points_win,
            points_draw=item.points_draw,
            points_loss=item.points_loss,
        )

    @staticmethod
    def _to_player_info(item: SeasonPlayerResult) -> SeasonPlayerInfo:
        return SeasonPlayerInfo(
            player_guid=item.player_guid,
            name=item.name,
            surname1=item.surname1,
            surname2=item.surname2,
            nationality=item.nationality,
            nickname=item.nickname,
            position=item.position,
            played=item.played,
            goals=item.goals,
            assists=item.assists,
            wins=item.wins,
            losses=item.losses,
            draws=item.draws,
            quality_level=item.quality_level,
            points=item.points,
        )

    @classmethod
    def _to_page(cls, page: SeasonPlayersPageResult) -> SeasonPlayersPage:
        return SeasonPlayersPage(
            items=[cls._to_player_info(item) for item in page.items],
            page=page.page,
            page_size=page.page_size,
            total=page.total,
        )

    @staticmethod
    def _to_match_info(item: MatchResult) -> SeasonMatchInfo:
        return SeasonMatchInfo(
            guid=item.guid,
            season_guid=item.season_guid,
            match_date=item.match_date,
            home_player_guid=item.home_player_guid,
            away_player_guid=item.away_player_guid,
            home_player_name=item.home_player_name,
            away_player_name=item.away_player_name,
            status=item.status,
            home_score=item.home_score,
            away_score=item.away_score,
        )

    @classmethod
    def _to_match_team(cls, item: MatchTeamResult) -> SeasonMatchTeamInfo:
        return SeasonMatchTeamInfo(
            team_guid=item.team_guid,
            team_name=item.team_name,
            score=item.score,
            total_assists=item.total_assists,
            total_saves=item.total_saves,
            average_rating=item.average_rating,
            players=[cls._to_match_player(stats) for stats in item.players],
        )

    @staticmethod
    def _to_match_player(item: MatchPlayerStatsResult) -> SeasonMatchPlayerStatsInfo:
        return SeasonMatchPlayerStatsInfo(
            player_guid=item.player_guid,
            name=item.name,
            surname1=item.surname1,
            surname2=item.surname2,
            nickname=item.nickname,
            position=item.position,
            goals=item.goals,
            assists=item.assists,
            saves=item.saves,
            rating=item.rating,
        )

    @classmethod
    def _to_match_detail(cls, item: MatchDetailResult) -> SeasonMatchDetailInfo:
        return SeasonMatchDetailInfo(
            guid=item.guid,
            season_guid=item.season_guid,
            match_date=item.match_date,
            status=item.status,
            home_team=cls._to_match_team(item.home_team),
            away_team=cls._to_match_team(item.away_team),
        )

    @staticmethod
    def _to_match_summary(item: MatchSummaryResult) -> SeasonMatchSummaryInfo:
        return SeasonMatchSummaryInfo(
            guid=item.guid,
            season_guid=item.season_guid,
            match_date=item.match_date,
            status=item.status,
            home_team_name=item.home_team_name,
            away_team_name=item.away_team_name,
            home_score=item.home_score,
            away_score=item.away_score,
            home_players=item.home_players,
            away_players=item.away_players,
        )

    @classmethod
    def _to_matches_page(cls, page: MatchesPageResult) -> SeasonMatchesPage:
        return SeasonMatchesPage(
            items=[cls._to_match_summary(item) for item in page.items],
            page=page.page,
            page_size=page.page_size,
            total=page.total,
        )
