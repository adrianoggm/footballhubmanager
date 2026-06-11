from core.application.models.season_competition_models import SeasonPlayersPage
from core.application.ports.season_competition_port import (
    PenaNotFoundError as RepositoryPenaNotFoundError,
)
from core.application.ports.season_competition_port import (
    SeasonNotFoundError as RepositorySeasonNotFoundError,
)
from core.application.ports.season_player_port import SeasonPlayerPort
from core.application.queries.season_player_queries import (
    GetSeasonStandingsQuery,
    ListSeasonPlayersQuery,
)
from core.application.use_cases.season_competition_errors import (
    PenaSeasonNotFoundError,
    PenaSeasonPenaNotFoundError,
)
from core.application.use_cases.season_competition_usecase_support import (
    to_players_page,
    to_repository_filters,
)


class ListSeasonPlayersHandler:
    def __init__(self, repository: SeasonPlayerPort):
        self.repository = repository

    def handle(self, query: ListSeasonPlayersQuery) -> SeasonPlayersPage:
        try:
            result = self.repository.list_season_players(
                pena_guid=query.pena_guid,
                season_guid=query.season_guid,
                filters=to_repository_filters(query.filters),
                page=query.page,
                page_size=query.page_size,
                order_by=query.order_by,
                order_dir=query.order_dir,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc
        return to_players_page(result)


class GetSeasonStandingsHandler:
    def __init__(self, repository: SeasonPlayerPort):
        self.repository = repository

    def handle(self, query: GetSeasonStandingsQuery) -> SeasonPlayersPage:
        try:
            result = self.repository.get_standings(
                pena_guid=query.pena_guid,
                season_guid=query.season_guid,
                filters=to_repository_filters(query.filters),
                page=query.page,
                page_size=query.page_size,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc
        return to_players_page(result)
