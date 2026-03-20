from auth.application.use_cases.login import LoginAdminUseCase, LoginUserUseCase
from auth.infrastructure.repositories.sqlalchemy_auth_account_repository import (
    SqlAlchemyAuthAccountRepository,
)
from fastapi import Depends
from persistence.application.use_cases.generate_pena_link_token_usecase import (
    GeneratePenaLinkTokenUseCase,
)
from persistence.application.use_cases.get_nationalities_usecase import GetNationalitiesUseCase
from persistence.application.use_cases.get_pena_players_usecase import GetPenaPlayersUseCase
from persistence.application.use_cases.get_penas_usecase import GetPenasUseCase
from persistence.application.use_cases.get_player_profile_usecase import (
    GetPlayerProfileUseCase,
)
from persistence.application.use_cases.get_season_match_insights_usecase import (
    GetSeasonMatchInsightsUseCase,
)
from persistence.application.use_cases.link_user_to_pena_usecase import LinkUserToPenaUseCase
from persistence.application.use_cases.manage_pena_accountability_usecase import (
    ManagePenaAccountabilityUseCase,
)
from persistence.application.use_cases.manage_pena_labels_usecase import (
    ManagePenaLabelsUseCase,
)
from persistence.application.use_cases.manage_pena_membership_usecase import (
    ManagePenaMembershipUseCase,
)
from persistence.application.use_cases.manage_pena_seasons_usecase import (
    ManagePenaSeasonsUseCase,
)
from persistence.application.use_cases.manage_season_competition_usecase import (
    ManageSeasonCompetitionUseCase,
)
from persistence.application.use_cases.manage_season_lifecycle_usecase import (
    ManageSeasonLifecycleUseCase,
)
from persistence.application.use_cases.manage_season_matches_usecase import (
    ManageSeasonMatchesUseCase,
)
from persistence.application.use_cases.manage_season_players_usecase import (
    ManageSeasonPlayersUseCase,
)
from persistence.application.use_cases.register_admin_usecase import RegisterAdminUseCase
from persistence.application.use_cases.register_user_usecase import RegisterUserUseCase
from persistence.application.use_cases.update_player_profile_usecase import (
    UpdatePlayerProfileUseCase,
)
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


def get_penas_use_case(db: Session = Depends(get_db)) -> GetPenasUseCase:
    return GetPenasUseCase(SqlAlchemyPenaQueryRepository(db))


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


def get_manage_pena_seasons_use_case(
    db: Session = Depends(get_db),
) -> ManagePenaSeasonsUseCase:
    return ManagePenaSeasonsUseCase(SqlAlchemyPenaSeasonRepository(db))


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
