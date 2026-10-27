import pytest
from core.domain.label_config import (
    DEFAULT_LABEL_COLOR,
    DEFAULT_POSITION_LABEL_COLORS,
    DEFAULT_ROLE_LABEL_COLORS,
    align_label_colors,
    clean_labels,
    default_color_for_label,
    default_role_label,
    dump_label_colors_payload,
    dump_labels_payload,
    find_label,
    normalize_hex_color,
    parse_label_colors_payload,
    parse_labels_payload,
    pick_preferred_label,
)


def test_clean_labels_removes_blanks_and_case_insensitive_duplicates():
    assert clean_labels([" President ", "", "member", "MEMBER", None]) == ["President", "member"]


@pytest.mark.parametrize("raw", [None, "", "oops", '{"role": "member"}', '[" ", ""]'])
def test_parse_labels_payload_falls_back_when_payload_is_invalid(raw):
    assert parse_labels_payload(raw, fallback=("member", "guest")) == ["member", "guest"]


def test_parse_and_dump_labels_payload_roundtrip():
    labels = parse_labels_payload('[" President ", "member", "MEMBER"]', fallback=("member",))

    assert labels == ["President", "member"]
    assert dump_labels_payload(labels) == '["President", "member"]'


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        (None, None),
        ("", None),
        ("fff000", "#FFF000"),
        ("#abc123", "#ABC123"),
        ("nope", None),
    ],
)
def test_normalize_hex_color_handles_valid_and_invalid_values(raw, expected):
    assert normalize_hex_color(raw) == expected


def test_default_color_for_label_uses_default_mapping_and_fallback():
    assert default_color_for_label("member", defaults=DEFAULT_ROLE_LABEL_COLORS) == "#15803D"
    assert (
        default_color_for_label("unknown", defaults={}, fallback="bad-value") == DEFAULT_LABEL_COLOR
    )


def test_parse_label_colors_payload_filters_invalid_entries():
    parsed = parse_label_colors_payload(
        '{" Member ": "00ff00", "guest": "#64748b", "": "#000000", "bad": "blue"}'
    )

    assert parsed == {"member": "#00FF00", "guest": "#64748B"}


def test_dump_label_colors_payload_normalizes_and_filters_entries():
    dumped = dump_label_colors_payload(
        {" Member ": "00ff00", "guest": "#64748b", "": "#000000", "bad": "blue"}
    )

    assert dumped == '{"member": "#00FF00", "guest": "#64748B"}'


def test_align_label_colors_prefers_configured_colors_and_falls_back_to_defaults():
    colors = align_label_colors(
        ["President", "member", "keeper"],
        configured_colors={" MEMBER ": "00ff00"},
        defaults={**DEFAULT_ROLE_LABEL_COLORS, **DEFAULT_POSITION_LABEL_COLORS},
    )

    assert colors == {
        "President": "#B45309",
        "member": "#00FF00",
        "keeper": "#EA580C",
    }


@pytest.mark.parametrize(
    ("options", "preferred", "expected"),
    [
        ([], "member", None),
        (["Member", "Guest"], "guest", "Guest"),
        (["Member", "Guest"], "president", "Member"),
    ],
)
def test_pick_preferred_label_returns_expected_option(options, preferred, expected):
    assert pick_preferred_label(options, preferred) == expected


def test_find_label_returns_configured_label_case_insensitively():
    assert find_label(["Portero", "defender"], "  portero ") == "Portero"
    assert find_label(["Portero", "defender"], "DEFENDER") == "defender"


@pytest.mark.parametrize("value", ["", "   ", "12", "striker"])
def test_find_label_returns_none_for_unknown_or_blank(value):
    assert find_label(["attacker", "keeper"], value) is None


@pytest.mark.parametrize(
    ("options", "has_account", "expected"),
    [
        (["president", "coordinator", "member", "guest"], True, "member"),
        (["president", "coordinator", "member", "guest"], False, "guest"),
        (["president", "coordinator", "member"], False, "member"),
        (["president", "coordinator", "Guest"], True, "Guest"),
        # Neither member nor guest: least privileged (last), never the first label.
        (["president", "coordinator", "socio"], False, "socio"),
        ([], True, None),
    ],
)
def test_default_role_label_is_deterministic_and_never_the_top_role(options, has_account, expected):
    assert default_role_label(options, has_account=has_account) == expected
