from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from persistence.application.ports.season_competition_port import MatchNotFoundError
from persistence.infrastructure.repository.db.season_match_repository import (
    SqlAlchemySeasonMatchRepository,
)


def test_list_season_matches_returns_empty_page_when_no_matches():
    session = Mock()
    total_result = Mock()
    total_result.scalar.return_value = 0
    matches_result = Mock()
    matches_result.scalars.return_value = []
    session.execute.side_effect = [total_result, matches_result]

    repo = SqlAlchemySeasonMatchRepository(session)
    repo._get_pena = lambda _pena_guid: SimpleNamespace(id=11)
    repo._get_season = lambda *, pena_id, season_guid: SimpleNamespace(id=22, guid="season-guid")

    page = repo.list_season_matches(
        pena_guid="pena-guid",
        season_guid="season-guid",
        page=1,
        page_size=20,
    )

    assert page.items == []
    assert page.page == 1
    assert page.page_size == 20
    assert page.total == 0


def test_delete_match_for_admin_rolls_back_when_match_bundle_is_missing():
    session = Mock()
    repo = SqlAlchemySeasonMatchRepository(session)
    repo._get_pena = lambda _pena_guid: SimpleNamespace(id=11, id_admin=7)
    repo._get_season = lambda *, pena_id, season_guid: SimpleNamespace(id=22)
    repo._get_match_teams = lambda *, season_id, match_guid, for_update: None

    with pytest.raises(MatchNotFoundError):
        repo.delete_match_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=7,
        )

    session.rollback.assert_called_once()
