from core.application.commands.season_match_commands import (
    CreateSeasonMatchCommand,
    CreateSeasonMatchEventCommand,
    CreateSeasonMatchWithLineupsCommand,
    DeleteSeasonMatchCommand,
    DeleteSeasonMatchEventCommand,
    PauseSeasonMatchCommand,
    ResumeSeasonMatchCommand,
    SetSeasonMatchGoalkeeperRotationCommand,
    StartSeasonMatchCommand,
    StopSeasonMatchCommand,
    UpdateSeasonMatchCommand,
    UpdateSeasonMatchLineupsCommand,
    UpdateSeasonMatchResultCommand,
    UpdateSeasonMatchStatsCommand,
)
from core.application.models.season_competition_models import (
    SeasonMatchDetailInfo,
    SeasonMatchInfo,
)
from core.application.policies import FieldUpdate
from core.application.ports.season_competition_port import (
    InvalidMatchDataError as RepositoryInvalidMatchDataError,
)
from core.application.ports.season_competition_port import (
    InvalidSeasonPlayerStatsError as RepositoryInvalidSeasonPlayerStatsError,
)
from core.application.ports.season_competition_port import (
    MatchClockAlreadyPausedError as RepositoryMatchClockAlreadyPausedError,
)
from core.application.ports.season_competition_port import (
    MatchClockAlreadyStartedError as RepositoryMatchClockAlreadyStartedError,
)
from core.application.ports.season_competition_port import (
    MatchClockNotPausedError as RepositoryMatchClockNotPausedError,
)
from core.application.ports.season_competition_port import (
    MatchClockNotRunningError as RepositoryMatchClockNotRunningError,
)
from core.application.ports.season_competition_port import (
    MatchEventNotFoundError as RepositoryMatchEventNotFoundError,
)
from core.application.ports.season_competition_port import (
    MatchEventPlayerNotInMatchError as RepositoryMatchEventPlayerNotInMatchError,
)
from core.application.ports.season_competition_port import (
    MatchLineupLockedError as RepositoryMatchLineupLockedError,
)
from core.application.ports.season_competition_port import (
    MatchNotFoundError as RepositoryMatchNotFoundError,
)
from core.application.ports.season_competition_port import (
    MatchPlayersNotInSeasonError as RepositoryMatchPlayersNotInSeasonError,
)
from core.application.ports.season_competition_port import (
    MatchReportClosedError as RepositoryMatchReportClosedError,
)
from core.application.ports.season_competition_port import (
    MatchStatsMismatchError as RepositoryMatchStatsMismatchError,
)
from core.application.ports.season_competition_port import (
    PenaNotFoundError as RepositoryPenaNotFoundError,
)
from core.application.ports.season_competition_port import (
    PenaNotManagedByAdminError as RepositoryPenaNotManagedByAdminError,
)
from core.application.ports.season_competition_port import (
    PlayerNotFoundError as RepositoryPlayerNotFoundError,
)
from core.application.ports.season_competition_port import (
    SamePlayerMatchError as RepositorySamePlayerMatchError,
)
from core.application.ports.season_competition_port import (
    SeasonNotFoundError as RepositorySeasonNotFoundError,
)
from core.application.ports.season_match_port import SeasonMatchPort
from core.application.use_cases.season_competition_errors import (
    InvalidSeasonMatchDataError,
    InvalidSeasonPlayerUpdateDataError,
    PenaSeasonAccessDeniedError,
    PenaSeasonNotFoundError,
    PenaSeasonPenaNotFoundError,
    SeasonMatchAlreadyStartedError,
    SeasonMatchClockAlreadyPausedError,
    SeasonMatchClockNotPausedError,
    SeasonMatchClockNotRunningError,
    SeasonMatchEventNotFoundError,
    SeasonMatchEventPlayerNotInMatchError,
    SeasonMatchInvalidPlayersError,
    SeasonMatchLineupLockedError,
    SeasonMatchNotFoundError,
    SeasonMatchPlayersNotInSeasonError,
    SeasonMatchReportClosedError,
    SeasonMatchStatsMismatchError,
    SeasonPlayerNotFoundError,
)
from core.application.use_cases.season_competition_usecase_support import (
    clean_name,
    normalize_match_event,
    normalize_player_stats,
    to_match_detail,
    to_match_info,
    validate_team_lineup,
)


class CreateSeasonMatchHandler:
    def __init__(self, repository: SeasonMatchPort):
        self.repository = repository

    def handle(self, command: CreateSeasonMatchCommand) -> SeasonMatchInfo:
        data = command.data
        if data.home_player_guid == data.away_player_guid:
            raise SeasonMatchInvalidPlayersError()
        try:
            created = self.repository.create_match_for_admin(
                pena_guid=command.pena_guid,
                season_guid=command.season_guid,
                admin_id=command.admin_id,
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


class UpdateSeasonMatchResultHandler:
    def __init__(self, repository: SeasonMatchPort):
        self.repository = repository

    def handle(self, command: UpdateSeasonMatchResultCommand) -> SeasonMatchInfo:
        update = command.update
        if update.home_score < 0 or update.away_score < 0:
            raise InvalidSeasonPlayerUpdateDataError()
        try:
            updated = self.repository.update_match_result_for_admin(
                pena_guid=command.pena_guid,
                season_guid=command.season_guid,
                match_guid=command.match_guid,
                admin_id=command.admin_id,
                home_score=update.home_score,
                away_score=update.away_score,
                standings_policy=update.standings_policy,
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


class CreateSeasonMatchWithLineupsHandler:
    def __init__(self, repository: SeasonMatchPort):
        self.repository = repository

    def handle(self, command: CreateSeasonMatchWithLineupsCommand) -> SeasonMatchDetailInfo:
        data = command.data
        validate_team_lineup(data.home_team.player_guids)
        validate_team_lineup(data.away_team.player_guids)
        if set(data.home_team.player_guids).intersection(set(data.away_team.player_guids)):
            raise SeasonMatchInvalidPlayersError()

        try:
            created = self.repository.create_match_with_lineups_for_admin(
                pena_guid=command.pena_guid,
                season_guid=command.season_guid,
                admin_id=command.admin_id,
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


class UpdateSeasonMatchStatsHandler:
    def __init__(self, repository: SeasonMatchPort):
        self.repository = repository

    def handle(self, command: UpdateSeasonMatchStatsCommand) -> SeasonMatchDetailInfo:
        update = command.update
        home_stats = normalize_player_stats(update.home_players)
        away_stats = normalize_player_stats(update.away_players)

        try:
            updated = self.repository.update_match_stats_for_admin(
                pena_guid=command.pena_guid,
                season_guid=command.season_guid,
                match_guid=command.match_guid,
                admin_id=command.admin_id,
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


class UpdateSeasonMatchHandler:
    def __init__(self, repository: SeasonMatchPort):
        self.repository = repository

    def handle(self, command: UpdateSeasonMatchCommand) -> SeasonMatchDetailInfo:
        update = command.update
        if not any(
            field_update.is_set()
            for field_update in (
                update.match_date,
                update.home_team_name,
                update.away_team_name,
            )
        ):
            raise InvalidSeasonMatchDataError()

        home_team_name = clean_name(update.home_team_name.value)
        away_team_name = clean_name(update.away_team_name.value)
        if update.home_team_name.is_set() and home_team_name is None:
            raise InvalidSeasonMatchDataError()
        if update.away_team_name.is_set() and away_team_name is None:
            raise InvalidSeasonMatchDataError()
        if update.match_date.is_set() and update.match_date.value is None:
            raise InvalidSeasonMatchDataError()

        try:
            updated = self.repository.update_match_for_admin(
                pena_guid=command.pena_guid,
                season_guid=command.season_guid,
                match_guid=command.match_guid,
                admin_id=command.admin_id,
                match_date=update.match_date,
                home_team_name=FieldUpdate.set(home_team_name)
                if update.home_team_name.is_set()
                else FieldUpdate.keep(),
                away_team_name=FieldUpdate.set(away_team_name)
                if update.away_team_name.is_set()
                else FieldUpdate.keep(),
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


class StartSeasonMatchHandler:
    def __init__(self, repository: SeasonMatchPort):
        self.repository = repository

    def handle(self, command: StartSeasonMatchCommand) -> SeasonMatchDetailInfo:
        try:
            updated = self.repository.start_match_for_admin(
                pena_guid=command.pena_guid,
                season_guid=command.season_guid,
                match_guid=command.match_guid,
                admin_id=command.admin_id,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaSeasonAccessDeniedError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc
        except RepositoryMatchNotFoundError as exc:
            raise SeasonMatchNotFoundError() from exc
        except RepositoryMatchClockAlreadyStartedError as exc:
            raise SeasonMatchAlreadyStartedError() from exc
        except RepositoryMatchReportClosedError as exc:
            raise SeasonMatchReportClosedError() from exc
        except RepositoryInvalidMatchDataError as exc:
            raise InvalidSeasonMatchDataError() from exc
        return to_match_detail(updated)


class StopSeasonMatchHandler:
    def __init__(self, repository: SeasonMatchPort):
        self.repository = repository

    def handle(self, command: StopSeasonMatchCommand) -> SeasonMatchDetailInfo:
        try:
            updated = self.repository.stop_match_for_admin(
                pena_guid=command.pena_guid,
                season_guid=command.season_guid,
                match_guid=command.match_guid,
                admin_id=command.admin_id,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaSeasonAccessDeniedError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc
        except RepositoryMatchNotFoundError as exc:
            raise SeasonMatchNotFoundError() from exc
        except RepositoryMatchClockNotRunningError as exc:
            raise SeasonMatchClockNotRunningError() from exc
        except RepositoryInvalidMatchDataError as exc:
            raise InvalidSeasonMatchDataError() from exc
        return to_match_detail(updated)


class PauseSeasonMatchHandler:
    def __init__(self, repository: SeasonMatchPort):
        self.repository = repository

    def handle(self, command: PauseSeasonMatchCommand) -> SeasonMatchDetailInfo:
        try:
            updated = self.repository.pause_match_for_admin(
                pena_guid=command.pena_guid,
                season_guid=command.season_guid,
                match_guid=command.match_guid,
                admin_id=command.admin_id,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaSeasonAccessDeniedError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc
        except RepositoryMatchNotFoundError as exc:
            raise SeasonMatchNotFoundError() from exc
        except RepositoryMatchClockNotRunningError as exc:
            raise SeasonMatchClockNotRunningError() from exc
        except RepositoryMatchClockAlreadyPausedError as exc:
            raise SeasonMatchClockAlreadyPausedError() from exc
        except RepositoryInvalidMatchDataError as exc:
            raise InvalidSeasonMatchDataError() from exc
        return to_match_detail(updated)


class ResumeSeasonMatchHandler:
    def __init__(self, repository: SeasonMatchPort):
        self.repository = repository

    def handle(self, command: ResumeSeasonMatchCommand) -> SeasonMatchDetailInfo:
        try:
            updated = self.repository.resume_match_for_admin(
                pena_guid=command.pena_guid,
                season_guid=command.season_guid,
                match_guid=command.match_guid,
                admin_id=command.admin_id,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaSeasonAccessDeniedError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc
        except RepositoryMatchNotFoundError as exc:
            raise SeasonMatchNotFoundError() from exc
        except RepositoryMatchClockNotRunningError as exc:
            raise SeasonMatchClockNotRunningError() from exc
        except RepositoryMatchClockNotPausedError as exc:
            raise SeasonMatchClockNotPausedError() from exc
        except RepositoryInvalidMatchDataError as exc:
            raise InvalidSeasonMatchDataError() from exc
        return to_match_detail(updated)


class SetSeasonMatchGoalkeeperRotationHandler:
    # Upper bound keeps the rotation interval sane (2h); 0 disables the alarm.
    MAX_ROTATION_SECONDS = 7200

    def __init__(self, repository: SeasonMatchPort):
        self.repository = repository

    def handle(
        self, command: SetSeasonMatchGoalkeeperRotationCommand
    ) -> SeasonMatchDetailInfo:
        if command.rotation_seconds < 0 or command.rotation_seconds > self.MAX_ROTATION_SECONDS:
            raise InvalidSeasonMatchDataError()
        try:
            updated = self.repository.set_goalkeeper_rotation_for_admin(
                pena_guid=command.pena_guid,
                season_guid=command.season_guid,
                match_guid=command.match_guid,
                admin_id=command.admin_id,
                rotation_seconds=command.rotation_seconds,
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


class CreateSeasonMatchEventHandler:
    def __init__(self, repository: SeasonMatchPort):
        self.repository = repository

    def handle(self, command: CreateSeasonMatchEventCommand) -> SeasonMatchDetailInfo:
        event = normalize_match_event(command.data)
        try:
            updated = self.repository.create_match_event_for_admin(
                pena_guid=command.pena_guid,
                season_guid=command.season_guid,
                match_guid=command.match_guid,
                admin_id=command.admin_id,
                event=event,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaSeasonAccessDeniedError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc
        except RepositoryMatchNotFoundError as exc:
            raise SeasonMatchNotFoundError() from exc
        except RepositoryMatchEventPlayerNotInMatchError as exc:
            raise SeasonMatchEventPlayerNotInMatchError() from exc
        except RepositoryMatchClockNotRunningError as exc:
            raise SeasonMatchClockNotRunningError() from exc
        except RepositoryMatchReportClosedError as exc:
            raise SeasonMatchReportClosedError() from exc
        except RepositoryInvalidMatchDataError as exc:
            raise InvalidSeasonMatchDataError() from exc
        return to_match_detail(updated)


class DeleteSeasonMatchEventHandler:
    def __init__(self, repository: SeasonMatchPort):
        self.repository = repository

    def handle(self, command: DeleteSeasonMatchEventCommand) -> SeasonMatchDetailInfo:
        try:
            updated = self.repository.delete_match_event_for_admin(
                pena_guid=command.pena_guid,
                season_guid=command.season_guid,
                match_guid=command.match_guid,
                event_guid=command.event_guid,
                admin_id=command.admin_id,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaSeasonAccessDeniedError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc
        except RepositoryMatchNotFoundError as exc:
            raise SeasonMatchNotFoundError() from exc
        except RepositoryMatchEventNotFoundError as exc:
            raise SeasonMatchEventNotFoundError() from exc
        except RepositoryMatchReportClosedError as exc:
            raise SeasonMatchReportClosedError() from exc
        except RepositoryInvalidMatchDataError as exc:
            raise InvalidSeasonMatchDataError() from exc
        return to_match_detail(updated)


class UpdateSeasonMatchLineupsHandler:
    def __init__(self, repository: SeasonMatchPort):
        self.repository = repository

    def handle(self, command: UpdateSeasonMatchLineupsCommand) -> SeasonMatchDetailInfo:
        update = command.update
        validate_team_lineup(update.home_player_guids)
        validate_team_lineup(update.away_player_guids)
        if set(update.home_player_guids).intersection(set(update.away_player_guids)):
            raise SeasonMatchInvalidPlayersError()

        try:
            updated = self.repository.update_match_lineups_for_admin(
                pena_guid=command.pena_guid,
                season_guid=command.season_guid,
                match_guid=command.match_guid,
                admin_id=command.admin_id,
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


class DeleteSeasonMatchHandler:
    def __init__(self, repository: SeasonMatchPort):
        self.repository = repository

    def handle(self, command: DeleteSeasonMatchCommand) -> None:
        try:
            self.repository.delete_match_for_admin(
                pena_guid=command.pena_guid,
                season_guid=command.season_guid,
                match_guid=command.match_guid,
                admin_id=command.admin_id,
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
