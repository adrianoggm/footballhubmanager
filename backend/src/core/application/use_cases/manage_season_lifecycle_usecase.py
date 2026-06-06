from datetime import date

from core.application.models.season_competition_models import SeasonCreate, SeasonInfo
from core.application.ports.season_competition_port import (
    InvalidSeasonDateRangeError as RepositoryInvalidSeasonDateRangeError,
)
from core.application.ports.season_competition_port import (
    PenaNotFoundError as RepositoryPenaNotFoundError,
)
from core.application.ports.season_competition_port import (
    PenaNotManagedByAdminError as RepositoryPenaNotManagedByAdminError,
)
from core.application.ports.season_competition_port import SeasonCompetitionPort
from core.application.ports.season_competition_port import (
    SeasonDateRangeOverlapError as RepositorySeasonDateRangeOverlapError,
)
from core.application.use_cases.season_competition_errors import (
    InvalidSeasonDataError,
    PenaSeasonAccessDeniedError,
    PenaSeasonDateOverlapError,
    PenaSeasonNotFoundError,
    PenaSeasonPenaNotFoundError,
)
from core.application.use_cases.season_competition_usecase_support import to_season_info


class ManageSeasonLifecycleUseCase:
    def __init__(self, repository: SeasonCompetitionPort):
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
        return to_season_info(season)

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
        return to_season_info(created)
