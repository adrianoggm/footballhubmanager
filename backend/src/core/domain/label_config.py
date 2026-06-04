import json
import re
from typing import Iterable

DEFAULT_ROLE_LABELS = ("president", "coordinator", "member", "guest")
DEFAULT_POSITION_LABELS = ("attacker", "defender", "midfielder", "polivalent", "keeper")
DEFAULT_ROLE_LABEL_COLORS = {
    "president": "#B45309",
    "coordinator": "#1D4ED8",
    "member": "#15803D",
    "guest": "#64748B",
}
DEFAULT_POSITION_LABEL_COLORS = {
    "attacker": "#DC2626",
    "defender": "#2563EB",
    "midfielder": "#16A34A",
    "polivalent": "#7C3AED",
    "keeper": "#EA580C",
}
DEFAULT_LABEL_COLOR = "#64748B"
MAX_LABELS = 20
MAX_LABEL_LENGTH = 40
HEX_COLOR_RE = re.compile(r"^#?[0-9a-fA-F]{6}$")


def clean_labels(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    cleaned: list[str] = []
    for value in values:
        normalized = str(value or "").strip()
        if not normalized:
            continue
        key = normalized.casefold()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(normalized)
    return cleaned


def parse_labels_payload(raw: str | None, *, fallback: tuple[str, ...]) -> list[str]:
    if not raw:
        return list(fallback)
    try:
        parsed = json.loads(raw)
    except (TypeError, ValueError):
        return list(fallback)
    if not isinstance(parsed, list):
        return list(fallback)
    cleaned = clean_labels(parsed)
    return cleaned if cleaned else list(fallback)


def dump_labels_payload(values: list[str]) -> str:
    return json.dumps(values, ensure_ascii=True)


def normalize_hex_color(value: str | None) -> str | None:
    if value is None:
        return None
    color = str(value).strip()
    if not color:
        return None
    if not HEX_COLOR_RE.fullmatch(color):
        return None
    if not color.startswith("#"):
        color = f"#{color}"
    return color.upper()


def default_color_for_label(
    label: str,
    *,
    defaults: dict[str, str],
    fallback: str = DEFAULT_LABEL_COLOR,
) -> str:
    key = str(label or "").strip().casefold()
    configured = defaults.get(key)
    normalized = normalize_hex_color(configured)
    if normalized:
        return normalized
    fallback_color = normalize_hex_color(fallback)
    return fallback_color or DEFAULT_LABEL_COLOR


def parse_label_colors_payload(raw: str | None) -> dict[str, str]:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
    except (TypeError, ValueError):
        return {}
    if not isinstance(parsed, dict):
        return {}

    output: dict[str, str] = {}
    for raw_key, raw_value in parsed.items():
        key = str(raw_key or "").strip().casefold()
        color = normalize_hex_color(str(raw_value or ""))
        if not key or not color:
            continue
        output[key] = color
    return output


def dump_label_colors_payload(values: dict[str, str]) -> str:
    normalized: dict[str, str] = {}
    for raw_key, raw_value in (values or {}).items():
        key = str(raw_key or "").strip().casefold()
        color = normalize_hex_color(raw_value)
        if not key or not color:
            continue
        normalized[key] = color
    return json.dumps(normalized, ensure_ascii=True)


def align_label_colors(
    labels: list[str],
    *,
    configured_colors: dict[str, str] | None,
    defaults: dict[str, str],
) -> dict[str, str]:
    normalized_configured: dict[str, str] = {}
    for raw_key, raw_value in (configured_colors or {}).items():
        key = str(raw_key or "").strip().casefold()
        color = normalize_hex_color(raw_value)
        if not key or not color:
            continue
        normalized_configured[key] = color

    output: dict[str, str] = {}
    for label in labels:
        key = str(label or "").strip().casefold()
        if not key:
            continue
        output[label] = normalized_configured.get(
            key,
            default_color_for_label(label, defaults=defaults),
        )
    return output


def pick_preferred_label(options: list[str], preferred: str) -> str | None:
    if not options:
        return None
    preferred_key = preferred.casefold()
    for option in options:
        if option.casefold() == preferred_key:
            return option
    return options[0]
