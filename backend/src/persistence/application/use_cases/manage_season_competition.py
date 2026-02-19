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
