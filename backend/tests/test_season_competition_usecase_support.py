import pytest
from core.application.models.season_competition_models import (
    SeasonMatchEventCreate,
    SeasonMatchPlayerStatsUpdate,
)
from core.application.policies import FieldUpdate
from core.application.use_cases.season_competition_errors import (
    InvalidSeasonMatchDataError,
    InvalidSeasonPlayerBatchDataError,
    InvalidSeasonPlayerUpdateDataError,
    SeasonMatchInvalidPlayersError,
)
from core.application.use_cases.season_competition_usecase_support import (
    clean_name,
    normalize_match_event,
    normalize_optional_text,
    normalize_player_guids,
    normalize_player_stats,
    validate_quality_value,
    validate_stat_value,
    validate_team_lineup,
)

# ---- validate_stat_value / validate_quality_value ----


@pytest.mark.parametrize("validator", [validate_stat_value, validate_quality_value])
def test_validate_value_allows_unset_and_valid(validator):
    validator(FieldUpdate.keep())  # not set -> no-op
    validator(FieldUpdate.set(3))


@pytest.mark.parametrize("validator", [validate_stat_value, validate_quality_value])
@pytest.mark.parametrize("bad", [FieldUpdate.set(-1), FieldUpdate.set(None)])
def test_validate_value_rejects_negative_or_none(validator, bad):
    with pytest.raises(InvalidSeasonPlayerUpdateDataError):
        validator(bad)


# ---- validate_team_lineup ----


def test_validate_team_lineup_accepts_distinct_players():
    validate_team_lineup(["p1", "p2"])


def test_validate_team_lineup_rejects_empty():
    with pytest.raises(InvalidSeasonMatchDataError):
        validate_team_lineup([])


def test_validate_team_lineup_rejects_blank_entry():
    with pytest.raises(InvalidSeasonMatchDataError):
        validate_team_lineup(["p1", "  "])


def test_validate_team_lineup_rejects_duplicates():
    with pytest.raises(SeasonMatchInvalidPlayersError):
        validate_team_lineup(["p1", "p1"])


# ---- clean_name ----


@pytest.mark.parametrize(
    ("value", "expected"),
    [(None, None), ("  ", None), ("  Reds  ", "Reds")],
)
def test_clean_name(value, expected):
    assert clean_name(value) == expected


# ---- normalize_optional_text ----


def test_normalize_optional_text_none_and_blank_become_none():
    assert normalize_optional_text(None, max_length=10, invalid_error=ValueError) is None
    assert normalize_optional_text("   ", max_length=10, invalid_error=ValueError) is None


def test_normalize_optional_text_trims_and_validates_length():
    assert normalize_optional_text("  hi  ", max_length=10, invalid_error=ValueError) == "hi"
    with pytest.raises(InvalidSeasonMatchDataError):
        normalize_optional_text("x" * 11, max_length=10, invalid_error=InvalidSeasonMatchDataError)


# ---- normalize_player_guids ----


def test_normalize_player_guids_trims_valid_input():
    assert normalize_player_guids([" a ", "b"]) == ["a", "b"]


@pytest.mark.parametrize("guids", [[], ["a", "  "], ["a", "a"]])
def test_normalize_player_guids_rejects_invalid(guids):
    with pytest.raises(InvalidSeasonPlayerBatchDataError):
        normalize_player_guids(guids)


# ---- normalize_player_stats ----


def _stat(player_guid: str, **kw) -> SeasonMatchPlayerStatsUpdate:
    base = {"goals": 0, "assists": 0, "saves": 0, "rating": 0.0}
    base.update(kw)
    return SeasonMatchPlayerStatsUpdate(player_guid=player_guid, **base)


def test_normalize_player_stats_valid():
    result = normalize_player_stats([_stat("p1", goals=2), _stat("p2", assists=1)])
    assert [r.player_guid for r in result] == ["p1", "p2"]


def test_normalize_player_stats_rejects_empty():
    with pytest.raises(InvalidSeasonMatchDataError):
        normalize_player_stats([])


def test_normalize_player_stats_rejects_blank_guid():
    with pytest.raises(InvalidSeasonMatchDataError):
        normalize_player_stats([_stat("  ")])


def test_normalize_player_stats_rejects_duplicate_guid():
    with pytest.raises(InvalidSeasonMatchDataError):
        normalize_player_stats([_stat("p1"), _stat("p1")])


@pytest.mark.parametrize("field", ["goals", "assists", "saves", "rating"])
def test_normalize_player_stats_rejects_negative(field):
    with pytest.raises(InvalidSeasonMatchDataError):
        normalize_player_stats([_stat("p1", **{field: -1})])


# ---- normalize_match_event ----


def _event(**kw) -> SeasonMatchEventCreate:
    base = {
        "event_type": "goal",
        "team_side": "home",
        "player_guid": "p1",
        "related_player_guid": None,
        "note": None,
        "elapsed_seconds": 60,
        "value_delta": 1,
    }
    base.update(kw)
    return SeasonMatchEventCreate(**base)


def test_normalize_match_event_valid():
    event = normalize_match_event(_event(note="  assist play  "))
    assert event.event_type == "goal"
    assert event.team_side == "home"
    assert event.player_guid == "p1"
    assert event.note == "assist play"
    assert event.value_delta == 1


def test_normalize_match_event_rejects_unknown_type():
    with pytest.raises(InvalidSeasonMatchDataError):
        normalize_match_event(_event(event_type="bogus"))


def test_normalize_match_event_rejects_unknown_team_side():
    with pytest.raises(InvalidSeasonMatchDataError):
        normalize_match_event(_event(team_side="bogus"))


def test_normalize_match_event_requires_player_for_player_event():
    with pytest.raises(InvalidSeasonMatchDataError):
        normalize_match_event(_event(event_type="goal", player_guid=None))


def test_normalize_match_event_rejects_negative_elapsed():
    with pytest.raises(InvalidSeasonMatchDataError):
        normalize_match_event(_event(elapsed_seconds=-1))


@pytest.mark.parametrize("value_delta", [0, 2, -2])
def test_normalize_match_event_rejects_bad_value_delta(value_delta):
    with pytest.raises(InvalidSeasonMatchDataError):
        normalize_match_event(_event(value_delta=value_delta))


def test_normalize_match_event_rejects_self_related_player():
    with pytest.raises(InvalidSeasonMatchDataError):
        normalize_match_event(_event(player_guid="p1", related_player_guid="p1"))


def test_normalize_match_event_allows_other_type_without_player():
    event = normalize_match_event(_event(event_type="other", player_guid=None))
    assert event.event_type == "other"
    assert event.player_guid is None
