from datetime import date
from types import SimpleNamespace
from unittest.mock import Mock

from persistence.infrastructure.repository.db.pena_season_repository import (
    SqlAlchemyPenaSeasonRepository,
)


def test_find_for_pena_orders_seasons_by_end_date_desc_then_start_date_desc():
    session = Mock()
    seasons_result = Mock()
    seasons_result.scalars.return_value.all.return_value = [
        SimpleNamespace(
            guid="season-2027",
            start_date=date(2027, 1, 1),
            end_date=date(2027, 12, 31),
            points_win=3,
            points_draw=1,
            points_loss=0,
        ),
        SimpleNamespace(
            guid="season-2026",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            points_win=3,
            points_draw=1,
            points_loss=0,
        ),
    ]

    total_result = Mock()
    total_result.scalar.return_value = 2
    session.execute.side_effect = [seasons_result, total_result]

    repository = SqlAlchemyPenaSeasonRepository(session)
    repository._get_pena = lambda _pena_guid: SimpleNamespace(id=99)

    page = repository.find_for_pena(pena_guid="pena-guid", page=1, page_size=20)

    first_stmt = session.execute.call_args_list[0].args[0]
    compiled_sql = str(first_stmt).lower()
    assert "order by season.end_date desc, season.start_date desc" in compiled_sql
    assert page.total == 2
    assert [item.guid for item in page.items] == ["season-2027", "season-2026"]
