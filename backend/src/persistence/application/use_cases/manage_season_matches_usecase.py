from persistence.application.ports.season_competition_port import (
    InvalidMatchDataError as RepositoryInvalidMatchDataError,
)
from persistence.application.ports.season_competition_port import (
    InvalidSeasonPlayerStatsError as RepositoryInvalidSeasonPlayerStatsError,
)
from persistence.application.ports.season_competition_port import (
    MatchLineupLockedError as RepositoryMatchLineupLockedError,
)
from persistence.application.ports.season_competition_port import (
    MatchNotFoundError as RepositoryMatchNotFoundError,
)
from persistence.application.ports.season_competition_port import (
    MatchPlayersNotInSeasonError as RepositoryMatchPlayersNotInSeasonError,
)
from persistence.application.ports.season_competition_port import (
    MatchStatsMismatchError as RepositoryMatchStatsMismatchError,
)
from persistence.application.ports.season_competition_port import (
    PenaNotFoundError as RepositoryPenaNotFoundError,
)
from persistence.application.ports.season_competition_port import (
    PenaNotManagedByAdminError as RepositoryPenaNotManagedByAdminError,
)
from persistence.application.ports.season_competition_port import (
    PlayerNotFoundError as RepositoryPlayerNotFoundError,
)
from persistence.application.ports.season_competition_port import (
    SamePlayerMatchError as RepositorySamePlayerMatchError,
)
from persistence.application.ports.season_competition_port import (
    SeasonNotFoundError as RepositorySeasonNotFoundError,
)
from persistence.application.ports.season_match_port import SeasonMatchPort
from persistence.application.use_cases.season_competition_errors import (
    InvalidSeasonMatchDataError,
    InvalidSeasonPlayerUpdateDataError,
    PenaSeasonAccessDeniedError,
    PenaSeasonNotFoundError,
    PenaSeasonPenaNotFoundError,
    SeasonMatchInvalidPlayersError,
    SeasonMatchLineupLockedError,
    SeasonMatchNotFoundError,
    SeasonMatchPlayersNotInSeasonError,
    SeasonMatchStatsMismatchError,
    SeasonPlayerNotFoundError,
)

from .season_competition_models import (
    SeasonMatchCreate,
    SeasonMatchCreateDetailed,
    SeasonMatchDetailInfo,
    SeasonMatchesPage,
    SeasonMatchInfo,
    SeasonMatchLineupsUpdate,
    SeasonMatchResultUpdate,
    SeasonMatchStatsUpdate,
    SeasonMatchUpdate,
)
from .season_competition_usecase_support import (
    clean_name,
    normalize_player_stats,
    to_match_detail,
    to_match_info,
    to_matches_page,
    validate_team_lineup,
)


class ManageSeasonMatchesUseCase:
    def __init__(self, repository: SeasonMatchPort):
        self.repository = repository

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
        return to_match_info(created)

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
        return to_match_info(updated)

    def create_match_with_lineups_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        data: SeasonMatchCreateDetailed,
    ) -> SeasonMatchDetailInfo:
        validate_team_lineup(data.home_team.player_guids)
        validate_team_lineup(data.away_team.player_guids)
        if set(data.home_team.player_guids).intersection(set(data.away_team.player_guids)):
            raise SeasonMatchInvalidPlayersError()

        try:
            created = self.repository.create_match_with_lineups_for_admin(
                pena_guid=pena_guid,
                season_guid=season_guid,
                admin_id=admin_id,
                match_date=data.match_date,
                home_team_name=clean_name(data.home_team.team_name),
                away_team_name=clean_name(data.away_team.team_name),
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
        return to_match_detail(created)

    def update_match_stats_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
        update: SeasonMatchStatsUpdate,
    ) -> SeasonMatchDetailInfo:
        home_stats = normalize_player_stats(update.home_players)
        away_stats = normalize_player_stats(update.away_players)

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
        return to_match_detail(updated)

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

        home_team_name = clean_name(update.home_team_name)
        away_team_name = clean_name(update.away_team_name)
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
        return to_match_detail(updated)

    def update_match_lineups_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
        update: SeasonMatchLineupsUpdate,
    ) -> SeasonMatchDetailInfo:
        validate_team_lineup(update.home_player_guids)
        validate_team_lineup(update.away_player_guids)
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
        return to_match_detail(updated)

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
        return to_matches_page(result)

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
        return to_match_detail(result)
