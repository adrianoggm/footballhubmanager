import json
from typing import Iterable

DEFAULT_ROLE_LABELS = ("president", "coordinator", "member", "guest")
DEFAULT_POSITION_LABELS = ("attacker", "defender", "midfielder", "polivalent", "keeper")
MAX_LABELS = 20
MAX_LABEL_LENGTH = 40


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


def pick_preferred_label(options: list[str], preferred: str) -> str | None:
    if not options:
        return None
    preferred_key = preferred.casefold()
    for option in options:
        if option.casefold() == preferred_key:
            return option
    return options[0]
