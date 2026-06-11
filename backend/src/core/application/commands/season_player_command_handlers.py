from core.application.commands.season_player_commands import (
    RegisterSeasonPlayerCommand,
    RegisterSeasonPlayersBulkCommand,
    UnregisterSeasonPlayerCommand,
    UpdateSeasonPlayerStatsCommand,
)
from core.application.models.season_competition_models import SeasonPlayerInfo
from core.application.policies import FieldUpdate
from core.application.ports.season_competition_port import (
    InvalidMatchDataError as RepositoryInvalidMatchDataError,
)
from core.application.ports.season_competition_port import (
    InvalidSeasonPlayerStatsError as RepositoryInvalidSeasonPlayerStatsError,
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
    PlayerNotInPenaError as RepositoryPlayerNotInPenaError,
)
from core.application.ports.season_competition_port import (
    SeasonNotFoundError as RepositorySeasonNotFoundError,
)
from core.application.ports.season_competition_port import (
    SeasonPlayerAlreadyRegisteredError as RepositorySeasonPlayerAlreadyRegisteredError,
)
from core.application.ports.season_competition_port import (
    SeasonPlayerHasMatchesError as RepositorySeasonPlayerHasMatchesError,
)
from core.application.ports.season_competition_port import (
    SeasonPlayerNotFoundError as RepositorySeasonPlayerNotFoundError,
)
from core.application.ports.season_player_port import SeasonPlayerPort
from core.application.use_cases.season_competition_errors import (
    InvalidSeasonPlayerBatchDataError,
    InvalidSeasonPlayerUpdateDataError,
    PenaSeasonAccessDeniedError,
    PenaSeasonNotFoundError,
    PenaSeasonPenaNotFoundError,
    SeasonPlayerAlreadyRegisteredError,
    SeasonPlayerInMatchError,
    SeasonPlayerNotFoundError,
    SeasonPlayerNotInPenaError,
)
from core.application.use_cases.season_competition_usecase_support import (
    normalize_optional_text,
    normalize_player_guids,
    to_player_info,
    validate_quality_value,
    validate_stat_value,
)


class RegisterSeasonPlayerHandler:
    def __init__(self, repository: SeasonPlayerPort):
        self.repository = repository

    def handle(self, command: RegisterSeasonPlayerCommand) -> SeasonPlayerInfo:
        try:
            registered = self.repository.register_player_for_admin(
                pena_guid=command.pena_guid,
                season_guid=command.season_guid,
                admin_id=command.admin_id,
                player_guid=command.player_guid,
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
        return to_player_info(registered)


class RegisterSeasonPlayersBulkHandler:
    def __init__(self, repository: SeasonPlayerPort):
        self.repository = repository

    def handle(self, command: RegisterSeasonPlayersBulkCommand) -> list[SeasonPlayerInfo]:
        cleaned_guids = normalize_player_guids(command.player_guids)
        try:
            registered = self.repository.register_players_for_admin_bulk(
                pena_guid=command.pena_guid,
                season_guid=command.season_guid,
                admin_id=command.admin_id,
                player_guids=cleaned_guids,
                source_season_guid=(
                    str(command.source_season_guid).strip() if command.source_season_guid else None
                ),
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
        return [to_player_info(item) for item in registered]


class UpdateSeasonPlayerStatsHandler:
    def __init__(self, repository: SeasonPlayerPort):
        self.repository = repository

    def handle(self, command: UpdateSeasonPlayerStatsCommand) -> SeasonPlayerInfo:
        update = command.update
        if not any(
            field_update.is_set()
            for field_update in (
                update.wins,
                update.losses,
                update.draws,
                update.quality_level,
                update.role,
                update.position,
            )
        ):
            raise InvalidSeasonPlayerUpdateDataError()

        validate_stat_value(update.wins)
        validate_stat_value(update.losses)
        validate_stat_value(update.draws)
        validate_quality_value(update.quality_level)
        normalized_role = normalize_optional_text(
            update.role.value if update.role.is_set() else None,
            max_length=80,
            invalid_error=InvalidSeasonPlayerUpdateDataError,
        )
        normalized_position = normalize_optional_text(
            update.position.value if update.position.is_set() else None,
            max_length=50,
            invalid_error=InvalidSeasonPlayerUpdateDataError,
        )

        try:
            updated = self.repository.update_player_stats_for_admin(
                pena_guid=command.pena_guid,
                season_guid=command.season_guid,
                admin_id=command.admin_id,
                player_guid=command.player_guid,
                wins=update.wins,
                losses=update.losses,
                draws=update.draws,
                quality_level=update.quality_level,
                role=(
                    FieldUpdate.set(normalized_role) if update.role.is_set() else FieldUpdate.keep()
                ),
                position=(
                    FieldUpdate.set(normalized_position)
                    if update.position.is_set()
                    else FieldUpdate.keep()
                ),
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
        return to_player_info(updated)


class UnregisterSeasonPlayerHandler:
    def __init__(self, repository: SeasonPlayerPort):
        self.repository = repository

    def handle(self, command: UnregisterSeasonPlayerCommand) -> None:
        try:
            self.repository.unregister_player_for_admin(
                pena_guid=command.pena_guid,
                season_guid=command.season_guid,
                admin_id=command.admin_id,
                player_guid=command.player_guid,
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
