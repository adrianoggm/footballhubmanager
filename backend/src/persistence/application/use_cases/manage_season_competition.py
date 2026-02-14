from dataclasses import dataclass
from datetime import date

from persistence.application.ports.season_competition_repository import (
    InvalidSeasonDateRangeError as RepositoryInvalidSeasonDateRangeError,
    InvalidSeasonPlayerStatsError as RepositoryInvalidSeasonPlayerStatsError,
    MatchNotFoundError as RepositoryMatchNotFoundError,
    MatchPlayersNotInSeasonError as RepositoryMatchPlayersNotInSeasonError,
    MatchResult,
    PenaNotFoundError as RepositoryPenaNotFoundError,
    PenaNotManagedByAdminError as RepositoryPenaNotManagedByAdminError,
    PlayerNotFoundError as RepositoryPlayerNotFoundError,
    PlayerNotInPenaError as RepositoryPlayerNotInPenaError,
    SamePlayerMatchError as RepositorySamePlayerMatchError,
    SeasonCompetitionRepository,
    SeasonDateRangeOverlapError as RepositorySeasonDateRangeOverlapError,
    SeasonNotFoundError as RepositorySeasonNotFoundError,
    SeasonPlayerAlreadyRegisteredError as RepositorySeasonPlayerAlreadyRegisteredError,
    SeasonPlayerFilters,
    SeasonPlayerNotFoundError as RepositorySeasonPlayerNotFoundError,
    SeasonPlayerResult,
    SeasonPlayersPageResult,
    SeasonResult,
)


@dataclass(frozen=True)
class SeasonInfo:
    guid: str
    start_date: date
    end_date: date


@dataclass(frozen=True)
class SeasonPlayerInfo:
    player_guid: str
    name: str
    surname1: str
    surname2: str | None
    nationality: str
    nickname: str | None
    position: str | None
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
class SeasonMatchResultUpdate:
    home_score: int
    away_score: int
    update_standings: bool = True


@dataclass(frozen=True)
class SeasonMatchInfo:
    guid: str
    season_guid: str
    match_date: date
    home_player_guid: str
    away_player_guid: str
    home_player_name: str
    away_player_name: str
    home_score: int
    away_score: int


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


class SeasonMatchNotFoundError(Exception):
    pass


class SeasonMatchPlayersNotInSeasonError(Exception):
    pass


class SeasonMatchInvalidPlayersError(Exception):
    pass


class ManageSeasonCompetitionUseCase:
    def __init__(self, repository: SeasonCompetitionRepository):
        self.repository = repository

    def get_active_for_pena(self, *, pena_guid: str, reference_date: date | None = None) -> SeasonInfo:
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
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaSeasonAccessDeniedError() from exc
        except (RepositoryInvalidSeasonDateRangeError, RepositorySeasonDateRangeOverlapError) as exc:
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
        return self._to_match_info(updated)

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
    def _to_season_info(item: SeasonResult) -> SeasonInfo:
        return SeasonInfo(guid=item.guid, start_date=item.start_date, end_date=item.end_date)

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
            home_score=item.home_score,
            away_score=item.away_score,
        )
