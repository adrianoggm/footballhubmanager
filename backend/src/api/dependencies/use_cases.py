from auth.application.use_cases.login import LoginAdminUseCase, LoginUserUseCase
from auth.infrastructure.repositories.sqlalchemy_auth_account_repository import (
    SqlAlchemyAuthAccountRepository,
)
from core.application.commands.pena_accountability_command_handlers import (
    CreateExpenseHandler,
    RemoveExpenseHandler,
    RemoveMemberAccountHandler,
    UpdateAccountabilitySettingsHandler,
    UpsertMemberAccountHandler,
)
from core.application.commands.pena_accountability_commands import (
    CreateExpenseCommand,
    RemoveExpenseCommand,
    RemoveMemberAccountCommand,
    UpdateAccountabilitySettingsCommand,
    UpsertMemberAccountCommand,
)
from core.application.commands.pena_labels_command import UpdatePenaLabelsCommand
from core.application.commands.pena_labels_command_handler import UpdatePenaLabelsHandler
from core.application.commands.pena_link_command_handlers import (
    GeneratePenaClaimTokenHandler,
    GeneratePenaLinkTokenHandler,
    LinkExistingAccountToClaimHandler,
    LinkUserToPenaHandler,
    RegisterAndClaimPlayerHandler,
)
from core.application.commands.pena_link_commands import (
    GeneratePenaClaimTokenCommand,
    GeneratePenaLinkTokenCommand,
    LinkExistingAccountToClaimCommand,
    LinkUserToPenaCommand,
    RegisterAndClaimPlayerCommand,
)
from core.application.commands.pena_membership_command_handlers import (
    CreateGuestPlayerHandler,
    RemoveMembershipForAdminHandler,
    RemoveMembershipForUserHandler,
    UpdateMembershipForAdminHandler,
    UpdateMembershipForUserHandler,
)
from core.application.commands.pena_membership_commands import (
    CreateGuestPlayerCommand,
    RemoveMembershipForAdminCommand,
    RemoveMembershipForUserCommand,
    UpdateMembershipForAdminCommand,
    UpdateMembershipForUserCommand,
)
from core.application.commands.pena_season_command_handlers import (
    CreatePenaSeasonHandler,
    DeletePenaSeasonHandler,
    UpdatePenaSeasonHandler,
)
from core.application.commands.pena_season_commands import (
    CreatePenaSeasonCommand,
    DeletePenaSeasonCommand,
    UpdatePenaSeasonCommand,
)
from core.application.commands.player_profile_command_handlers import (
    UpdatePlayerProfileByAccountIdHandler,
    UpdatePlayerProfileByGuidHandler,
)
from core.application.commands.player_profile_commands import (
    UpdatePlayerProfileByAccountIdCommand,
    UpdatePlayerProfileByGuidCommand,
)
from core.application.commands.registration_command_handlers import (
    RegisterAdminHandler,
    RegisterUserHandler,
)
from core.application.commands.registration_commands import (
    RegisterAdminCommand,
    RegisterUserCommand,
)
from core.application.commands.season_match_command_handlers import (
    CreateSeasonMatchEventHandler,
    CreateSeasonMatchHandler,
    CreateSeasonMatchWithLineupsHandler,
    DeleteSeasonMatchEventHandler,
    DeleteSeasonMatchHandler,
    PauseSeasonMatchHandler,
    ResumeSeasonMatchHandler,
    SetSeasonMatchGoalkeeperRotationHandler,
    StartSeasonMatchHandler,
    StopSeasonMatchHandler,
    UpdateSeasonMatchHandler,
    UpdateSeasonMatchLineupsHandler,
    UpdateSeasonMatchResultHandler,
    UpdateSeasonMatchStatsHandler,
)
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
from core.application.commands.season_player_command_handlers import (
    RegisterSeasonPlayerHandler,
    RegisterSeasonPlayersBulkHandler,
    UnregisterSeasonPlayerHandler,
    UpdateSeasonPlayerStatsHandler,
)
from core.application.commands.season_player_commands import (
    RegisterSeasonPlayerCommand,
    RegisterSeasonPlayersBulkCommand,
    UnregisterSeasonPlayerCommand,
    UpdateSeasonPlayerStatsCommand,
)
from core.application.commands.update_pena_profile_command import UpdatePenaProfileCommand
from core.application.commands.update_pena_profile_handler import UpdatePenaProfileHandler
from core.application.queries.nationality_query import GetNationalitiesQuery
from core.application.queries.nationality_query_handler import GetNationalitiesHandler
from core.application.queries.pena_accountability_queries import (
    GetPenaAccountabilityQuery,
    GetPlayerGuidForAccountQuery,
)
from core.application.queries.pena_accountability_query_handlers import (
    GetPenaAccountabilityHandler,
    GetPlayerGuidForAccountHandler,
)
from core.application.queries.pena_labels_query import GetPenaLabelsQuery
from core.application.queries.pena_labels_query_handler import GetPenaLabelsHandler
from core.application.queries.pena_link_queries import InspectClaimTokenQuery
from core.application.queries.pena_link_query_handlers import InspectClaimTokenHandler
from core.application.queries.pena_membership_queries import (
    GetPenaMembershipForPlayerQuery,
    GetPenaMembershipForUserQuery,
)
from core.application.queries.pena_membership_query_handlers import (
    GetPenaMembershipForPlayerHandler,
    GetPenaMembershipForUserHandler,
)
from core.application.queries.pena_players_query import GetPenaPlayersQuery
from core.application.queries.pena_players_query_handler import GetPenaPlayersHandler
from core.application.queries.pena_queries import (
    GetPenaByGuidQuery,
    ListPenasForAdminQuery,
    ListPenasForUserQuery,
)
from core.application.queries.pena_query_handlers import (
    GetPenaByGuidHandler,
    ListPenasForAdminHandler,
    ListPenasForUserHandler,
)
from core.application.queries.pena_season_queries import (
    GetActivePenaSeasonQuery,
    GetPenaSeasonQuery,
    ListPenaSeasonsQuery,
)
from core.application.queries.pena_season_query_handlers import (
    GetActivePenaSeasonHandler,
    GetPenaSeasonHandler,
    ListPenaSeasonsHandler,
)
from core.application.queries.player_profile_queries import (
    GetPlayerProfileByAccountIdQuery,
    GetPlayerProfileByGuidQuery,
)
from core.application.queries.player_profile_query_handlers import (
    GetPlayerProfileByAccountIdHandler,
    GetPlayerProfileByGuidHandler,
)
from core.application.queries.season_match_insights_query import GetSeasonMatchInsightsQuery
from core.application.queries.season_match_insights_query_handler import (
    GetSeasonMatchInsightsHandler,
)
from core.application.queries.season_match_queries import (
    GetSeasonMatchDetailQuery,
    ListSeasonMatchesQuery,
)
from core.application.queries.season_match_query_handlers import (
    GetSeasonMatchDetailHandler,
    ListSeasonMatchesHandler,
)
from core.application.queries.season_player_queries import (
    GetSeasonStandingsQuery,
    ListSeasonPlayersQuery,
)
from core.application.queries.season_player_query_handlers import (
    GetSeasonStandingsHandler,
    ListSeasonPlayersHandler,
)
from fastapi import Depends
from persistence.infrastructure.repository.db.nationality_query_repository import (
    SqlAlchemyNationalityQueryRepository,
)
from persistence.infrastructure.repository.db.pena_accountability_repository import (
    SqlAlchemyPenaAccountabilityRepository,
)
from persistence.infrastructure.repository.db.pena_labels_repository import (
    SqlAlchemyPenaLabelsRepository,
)
from persistence.infrastructure.repository.db.pena_link_repository import (
    SqlAlchemyPenaLinkRepository,
)
from persistence.infrastructure.repository.db.pena_membership_repository import (
    SqlAlchemyPenaMembershipRepository,
)
from persistence.infrastructure.repository.db.pena_player_query_repository import (
    SqlAlchemyPenaPlayerQueryRepository,
)
from persistence.infrastructure.repository.db.pena_profile_repository import (
    SqlAlchemyPenaProfileRepository,
)
from persistence.infrastructure.repository.db.pena_query_repository import (
    SqlAlchemyPenaQueryRepository,
)
from persistence.infrastructure.repository.db.pena_season_repository import (
    SqlAlchemyPenaSeasonRepository,
)
from persistence.infrastructure.repository.db.player_profile_repository import (
    SqlAlchemyPlayerProfileRepository,
)
from persistence.infrastructure.repository.db.registration_repository import (
    SqlAlchemyRegistrationRepository,
)
from persistence.infrastructure.repository.db.season_match_insights_repository import (
    SqlAlchemySeasonMatchInsightsRepository,
)
from persistence.infrastructure.repository.db.season_match_repository import (
    SqlAlchemySeasonMatchRepository,
)
from persistence.infrastructure.repository.db.season_player_repository import (
    SqlAlchemySeasonPlayerRepository,
)
from persistence.module import get_db
from shared.application.bus.buses import CommandBus, QueryBus
from sqlalchemy.orm import Session


def get_login_user_use_case(db: Session = Depends(get_db)) -> LoginUserUseCase:
    return LoginUserUseCase(SqlAlchemyAuthAccountRepository(db))


def get_login_admin_use_case(db: Session = Depends(get_db)) -> LoginAdminUseCase:
    return LoginAdminUseCase(SqlAlchemyAuthAccountRepository(db))


def get_registration_command_bus(db: Session = Depends(get_db)) -> CommandBus:
    repository = SqlAlchemyRegistrationRepository(db)
    bus = CommandBus()
    bus.register(RegisterUserCommand, RegisterUserHandler(repository))
    bus.register(RegisterAdminCommand, RegisterAdminHandler(repository))
    return bus


def get_nationalities_query_bus(db: Session = Depends(get_db)) -> QueryBus:
    bus = QueryBus()
    bus.register(
        GetNationalitiesQuery, GetNationalitiesHandler(SqlAlchemyNationalityQueryRepository(db))
    )
    return bus


def get_pena_query_bus(db: Session = Depends(get_db)) -> QueryBus:
    repository = SqlAlchemyPenaQueryRepository(db)
    bus = QueryBus()
    bus.register(ListPenasForAdminQuery, ListPenasForAdminHandler(repository))
    bus.register(ListPenasForUserQuery, ListPenasForUserHandler(repository))
    bus.register(GetPenaByGuidQuery, GetPenaByGuidHandler(repository))
    return bus


def get_pena_link_command_bus(db: Session = Depends(get_db)) -> CommandBus:
    repository = SqlAlchemyPenaLinkRepository(db)
    bus = CommandBus()
    bus.register(GeneratePenaLinkTokenCommand, GeneratePenaLinkTokenHandler(repository))
    bus.register(GeneratePenaClaimTokenCommand, GeneratePenaClaimTokenHandler(repository))
    bus.register(LinkUserToPenaCommand, LinkUserToPenaHandler(repository))
    bus.register(RegisterAndClaimPlayerCommand, RegisterAndClaimPlayerHandler(repository))
    bus.register(LinkExistingAccountToClaimCommand, LinkExistingAccountToClaimHandler(repository))
    return bus


def get_pena_link_query_bus(db: Session = Depends(get_db)) -> QueryBus:
    repository = SqlAlchemyPenaLinkRepository(db)
    bus = QueryBus()
    bus.register(InspectClaimTokenQuery, InspectClaimTokenHandler(repository))
    return bus


def get_pena_labels_command_bus(db: Session = Depends(get_db)) -> CommandBus:
    bus = CommandBus()
    bus.register(
        UpdatePenaLabelsCommand, UpdatePenaLabelsHandler(SqlAlchemyPenaLabelsRepository(db))
    )
    return bus


def get_pena_labels_query_bus(db: Session = Depends(get_db)) -> QueryBus:
    bus = QueryBus()
    bus.register(GetPenaLabelsQuery, GetPenaLabelsHandler(SqlAlchemyPenaLabelsRepository(db)))
    return bus


def get_pena_accountability_query_bus(db: Session = Depends(get_db)) -> QueryBus:
    repository = SqlAlchemyPenaAccountabilityRepository(db)
    bus = QueryBus()
    bus.register(GetPenaAccountabilityQuery, GetPenaAccountabilityHandler(repository))
    bus.register(GetPlayerGuidForAccountQuery, GetPlayerGuidForAccountHandler(repository))
    return bus


def get_pena_accountability_command_bus(db: Session = Depends(get_db)) -> CommandBus:
    repository = SqlAlchemyPenaAccountabilityRepository(db)
    bus = CommandBus()
    bus.register(
        UpdateAccountabilitySettingsCommand, UpdateAccountabilitySettingsHandler(repository)
    )
    bus.register(UpsertMemberAccountCommand, UpsertMemberAccountHandler(repository))
    bus.register(RemoveMemberAccountCommand, RemoveMemberAccountHandler(repository))
    bus.register(CreateExpenseCommand, CreateExpenseHandler(repository))
    bus.register(RemoveExpenseCommand, RemoveExpenseHandler(repository))
    return bus


def get_pena_membership_query_bus(db: Session = Depends(get_db)) -> QueryBus:
    repository = SqlAlchemyPenaMembershipRepository(db)
    bus = QueryBus()
    bus.register(GetPenaMembershipForPlayerQuery, GetPenaMembershipForPlayerHandler(repository))
    bus.register(GetPenaMembershipForUserQuery, GetPenaMembershipForUserHandler(repository))
    return bus


def get_pena_membership_command_bus(db: Session = Depends(get_db)) -> CommandBus:
    repository = SqlAlchemyPenaMembershipRepository(db)
    bus = CommandBus()
    bus.register(UpdateMembershipForUserCommand, UpdateMembershipForUserHandler(repository))
    bus.register(RemoveMembershipForUserCommand, RemoveMembershipForUserHandler(repository))
    bus.register(UpdateMembershipForAdminCommand, UpdateMembershipForAdminHandler(repository))
    bus.register(RemoveMembershipForAdminCommand, RemoveMembershipForAdminHandler(repository))
    bus.register(CreateGuestPlayerCommand, CreateGuestPlayerHandler(repository))
    return bus


def get_pena_players_query_bus(db: Session = Depends(get_db)) -> QueryBus:
    bus = QueryBus()
    bus.register(
        GetPenaPlayersQuery, GetPenaPlayersHandler(SqlAlchemyPenaPlayerQueryRepository(db))
    )
    return bus


def get_pena_command_bus(db: Session = Depends(get_db)) -> CommandBus:
    bus = CommandBus()
    bus.register(
        UpdatePenaProfileCommand,
        UpdatePenaProfileHandler(SqlAlchemyPenaProfileRepository(db)),
    )
    return bus


def get_pena_season_command_bus(db: Session = Depends(get_db)) -> CommandBus:
    repository = SqlAlchemyPenaSeasonRepository(db)
    bus = CommandBus()
    bus.register(CreatePenaSeasonCommand, CreatePenaSeasonHandler(repository))
    bus.register(UpdatePenaSeasonCommand, UpdatePenaSeasonHandler(repository))
    bus.register(DeletePenaSeasonCommand, DeletePenaSeasonHandler(repository))
    return bus


def get_pena_season_query_bus(db: Session = Depends(get_db)) -> QueryBus:
    repository = SqlAlchemyPenaSeasonRepository(db)
    bus = QueryBus()
    bus.register(ListPenaSeasonsQuery, ListPenaSeasonsHandler(repository))
    bus.register(GetPenaSeasonQuery, GetPenaSeasonHandler(repository))
    bus.register(GetActivePenaSeasonQuery, GetActivePenaSeasonHandler(repository))
    return bus


def get_player_profile_query_bus(db: Session = Depends(get_db)) -> QueryBus:
    repository = SqlAlchemyPlayerProfileRepository(db)
    bus = QueryBus()
    bus.register(GetPlayerProfileByGuidQuery, GetPlayerProfileByGuidHandler(repository))
    bus.register(GetPlayerProfileByAccountIdQuery, GetPlayerProfileByAccountIdHandler(repository))
    return bus


def get_player_profile_command_bus(db: Session = Depends(get_db)) -> CommandBus:
    repository = SqlAlchemyPlayerProfileRepository(db)
    bus = CommandBus()
    bus.register(UpdatePlayerProfileByGuidCommand, UpdatePlayerProfileByGuidHandler(repository))
    bus.register(
        UpdatePlayerProfileByAccountIdCommand, UpdatePlayerProfileByAccountIdHandler(repository)
    )
    return bus


def get_season_player_command_bus(db: Session = Depends(get_db)) -> CommandBus:
    repository = SqlAlchemySeasonPlayerRepository(db)
    bus = CommandBus()
    bus.register(RegisterSeasonPlayerCommand, RegisterSeasonPlayerHandler(repository))
    bus.register(RegisterSeasonPlayersBulkCommand, RegisterSeasonPlayersBulkHandler(repository))
    bus.register(UpdateSeasonPlayerStatsCommand, UpdateSeasonPlayerStatsHandler(repository))
    bus.register(UnregisterSeasonPlayerCommand, UnregisterSeasonPlayerHandler(repository))
    return bus


def get_season_player_query_bus(db: Session = Depends(get_db)) -> QueryBus:
    repository = SqlAlchemySeasonPlayerRepository(db)
    bus = QueryBus()
    bus.register(ListSeasonPlayersQuery, ListSeasonPlayersHandler(repository))
    bus.register(GetSeasonStandingsQuery, GetSeasonStandingsHandler(repository))
    return bus


def get_season_match_command_bus(db: Session = Depends(get_db)) -> CommandBus:
    repository = SqlAlchemySeasonMatchRepository(db)
    bus = CommandBus()
    bus.register(CreateSeasonMatchCommand, CreateSeasonMatchHandler(repository))
    bus.register(UpdateSeasonMatchResultCommand, UpdateSeasonMatchResultHandler(repository))
    bus.register(
        CreateSeasonMatchWithLineupsCommand, CreateSeasonMatchWithLineupsHandler(repository)
    )
    bus.register(UpdateSeasonMatchStatsCommand, UpdateSeasonMatchStatsHandler(repository))
    bus.register(UpdateSeasonMatchCommand, UpdateSeasonMatchHandler(repository))
    bus.register(StartSeasonMatchCommand, StartSeasonMatchHandler(repository))
    bus.register(StopSeasonMatchCommand, StopSeasonMatchHandler(repository))
    bus.register(PauseSeasonMatchCommand, PauseSeasonMatchHandler(repository))
    bus.register(ResumeSeasonMatchCommand, ResumeSeasonMatchHandler(repository))
    bus.register(
        SetSeasonMatchGoalkeeperRotationCommand,
        SetSeasonMatchGoalkeeperRotationHandler(repository),
    )
    bus.register(CreateSeasonMatchEventCommand, CreateSeasonMatchEventHandler(repository))
    bus.register(DeleteSeasonMatchEventCommand, DeleteSeasonMatchEventHandler(repository))
    bus.register(UpdateSeasonMatchLineupsCommand, UpdateSeasonMatchLineupsHandler(repository))
    bus.register(DeleteSeasonMatchCommand, DeleteSeasonMatchHandler(repository))
    return bus


def get_season_match_query_bus(db: Session = Depends(get_db)) -> QueryBus:
    repository = SqlAlchemySeasonMatchRepository(db)
    bus = QueryBus()
    bus.register(ListSeasonMatchesQuery, ListSeasonMatchesHandler(repository))
    bus.register(GetSeasonMatchDetailQuery, GetSeasonMatchDetailHandler(repository))
    return bus


def get_season_match_insights_query_bus(db: Session = Depends(get_db)) -> QueryBus:
    bus = QueryBus()
    bus.register(
        GetSeasonMatchInsightsQuery,
        GetSeasonMatchInsightsHandler(SqlAlchemySeasonMatchInsightsRepository(db)),
    )
    return bus
