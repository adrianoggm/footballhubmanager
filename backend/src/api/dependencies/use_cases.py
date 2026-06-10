from auth.application.use_cases.login import LoginAdminUseCase, LoginUserUseCase
from auth.infrastructure.repositories.sqlalchemy_auth_account_repository import (
    SqlAlchemyAuthAccountRepository,
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
from core.application.commands.update_pena_profile_command import UpdatePenaProfileCommand
from core.application.commands.update_pena_profile_handler import UpdatePenaProfileHandler
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
from core.application.use_cases.generate_pena_link_token_usecase import (
    GeneratePenaLinkTokenUseCase,
)
from core.application.use_cases.get_nationalities_usecase import GetNationalitiesUseCase
from core.application.use_cases.get_pena_players_usecase import GetPenaPlayersUseCase
from core.application.use_cases.get_player_profile_usecase import GetPlayerProfileUseCase
from core.application.use_cases.get_season_match_insights_usecase import (
    GetSeasonMatchInsightsUseCase,
)
from core.application.use_cases.link_user_to_pena_usecase import LinkUserToPenaUseCase
from core.application.use_cases.manage_pena_accountability_usecase import (
    ManagePenaAccountabilityUseCase,
)
from core.application.use_cases.manage_pena_labels_usecase import (
    ManagePenaLabelsUseCase,
)
from core.application.use_cases.manage_pena_membership_usecase import (
    ManagePenaMembershipUseCase,
)
from core.application.use_cases.manage_season_competition_usecase import (
    ManageSeasonCompetitionUseCase,
)
from core.application.use_cases.manage_season_lifecycle_usecase import (
    ManageSeasonLifecycleUseCase,
)
from core.application.use_cases.manage_season_matches_usecase import (
    ManageSeasonMatchesUseCase,
)
from core.application.use_cases.manage_season_players_usecase import (
    ManageSeasonPlayersUseCase,
)
from core.application.use_cases.register_admin_usecase import RegisterAdminUseCase
from core.application.use_cases.register_user_usecase import RegisterUserUseCase
from core.application.use_cases.update_player_profile_usecase import (
    UpdatePlayerProfileUseCase,
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
from persistence.infrastructure.repository.db.season_competition_repository import (
    SqlAlchemySeasonCompetitionRepository,
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


def get_register_user_use_case(db: Session = Depends(get_db)) -> RegisterUserUseCase:
    return RegisterUserUseCase(SqlAlchemyRegistrationRepository(db))


def get_register_admin_use_case(db: Session = Depends(get_db)) -> RegisterAdminUseCase:
    return RegisterAdminUseCase(SqlAlchemyRegistrationRepository(db))


def get_nationalities_use_case(db: Session = Depends(get_db)) -> GetNationalitiesUseCase:
    return GetNationalitiesUseCase(SqlAlchemyNationalityQueryRepository(db))


def get_pena_query_bus(db: Session = Depends(get_db)) -> QueryBus:
    repository = SqlAlchemyPenaQueryRepository(db)
    bus = QueryBus()
    bus.register(ListPenasForAdminQuery, ListPenasForAdminHandler(repository))
    bus.register(ListPenasForUserQuery, ListPenasForUserHandler(repository))
    bus.register(GetPenaByGuidQuery, GetPenaByGuidHandler(repository))
    return bus


def get_generate_pena_link_token_use_case(
    db: Session = Depends(get_db),
) -> GeneratePenaLinkTokenUseCase:
    return GeneratePenaLinkTokenUseCase(SqlAlchemyPenaLinkRepository(db))


def get_link_user_to_pena_use_case(db: Session = Depends(get_db)) -> LinkUserToPenaUseCase:
    return LinkUserToPenaUseCase(SqlAlchemyPenaLinkRepository(db))


def get_pena_labels_use_case(db: Session = Depends(get_db)) -> ManagePenaLabelsUseCase:
    return ManagePenaLabelsUseCase(SqlAlchemyPenaLabelsRepository(db))


def get_pena_accountability_use_case(
    db: Session = Depends(get_db),
) -> ManagePenaAccountabilityUseCase:
    return ManagePenaAccountabilityUseCase(SqlAlchemyPenaAccountabilityRepository(db))


def get_pena_membership_use_case(
    db: Session = Depends(get_db),
) -> ManagePenaMembershipUseCase:
    return ManagePenaMembershipUseCase(SqlAlchemyPenaMembershipRepository(db))


def get_pena_players_use_case(db: Session = Depends(get_db)) -> GetPenaPlayersUseCase:
    return GetPenaPlayersUseCase(SqlAlchemyPenaPlayerQueryRepository(db))


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


def get_player_profile_use_case(db: Session = Depends(get_db)) -> GetPlayerProfileUseCase:
    return GetPlayerProfileUseCase(SqlAlchemyPlayerProfileRepository(db))


def get_update_player_profile_use_case(db: Session = Depends(get_db)) -> UpdatePlayerProfileUseCase:
    return UpdatePlayerProfileUseCase(SqlAlchemyPlayerProfileRepository(db))


def get_season_competition_use_case(
    db: Session = Depends(get_db),
) -> ManageSeasonCompetitionUseCase:
    return ManageSeasonCompetitionUseCase(
        SqlAlchemySeasonCompetitionRepository(db),
        player_repository=SqlAlchemySeasonPlayerRepository(db),
        match_repository=SqlAlchemySeasonMatchRepository(db),
    )


def get_manage_season_lifecycle_use_case(
    db: Session = Depends(get_db),
) -> ManageSeasonLifecycleUseCase:
    return ManageSeasonLifecycleUseCase(SqlAlchemySeasonCompetitionRepository(db))


def get_manage_season_players_use_case(
    db: Session = Depends(get_db),
) -> ManageSeasonPlayersUseCase:
    return ManageSeasonPlayersUseCase(SqlAlchemySeasonPlayerRepository(db))


def get_manage_season_matches_use_case(
    db: Session = Depends(get_db),
) -> ManageSeasonMatchesUseCase:
    return ManageSeasonMatchesUseCase(SqlAlchemySeasonMatchRepository(db))


def get_season_match_insights_use_case(
    db: Session = Depends(get_db),
) -> GetSeasonMatchInsightsUseCase:
    return GetSeasonMatchInsightsUseCase(SqlAlchemySeasonMatchInsightsRepository(db))
