from core.application.models.season_competition_models import (
    SeasonMatchDetailInfo,
    SeasonMatchesPage,
)
from core.application.ports.season_competition_port import (
    MatchNotFoundError as RepositoryMatchNotFoundError,
)
from core.application.ports.season_competition_port import (
    PenaNotFoundError as RepositoryPenaNotFoundError,
)
from core.application.ports.season_competition_port import (
    SeasonNotFoundError as RepositorySeasonNotFoundError,
)
from core.application.ports.season_match_port import SeasonMatchPort
from core.application.queries.season_match_queries import (
    GetSeasonMatchDetailQuery,
    ListSeasonMatchesQuery,
)
from core.application.use_cases.season_competition_errors import (
    PenaSeasonNotFoundError,
    PenaSeasonPenaNotFoundError,
    SeasonMatchNotFoundError,
)
from core.application.use_cases.season_competition_usecase_support import (
    to_match_detail,
    to_matches_page,
)


class ListSeasonMatchesHandler:
    def __init__(self, repository: SeasonMatchPort):
        self.repository = repository

    def handle(self, query: ListSeasonMatchesQuery) -> SeasonMatchesPage:
        try:
            result = self.repository.list_season_matches(
                pena_guid=query.pena_guid,
                season_guid=query.season_guid,
                page=query.page,
                page_size=query.page_size,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc
        return to_matches_page(result)


class GetSeasonMatchDetailHandler:
    def __init__(self, repository: SeasonMatchPort):
        self.repository = repository

    def handle(self, query: GetSeasonMatchDetailQuery) -> SeasonMatchDetailInfo:
        try:
            result = self.repository.get_match_detail(
                pena_guid=query.pena_guid,
                season_guid=query.season_guid,
                match_guid=query.match_guid,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc
        except RepositoryMatchNotFoundError as exc:
            raise SeasonMatchNotFoundError() from exc
        return to_match_detail(result)
