from dataclasses import dataclass

from .pena_listing_models import PenaInfo


@dataclass(frozen=True)
class PlayerProfile:
    guid: str
    name: str
    surname1: str
    surname2: str | None
    nationality: str
    penas: list[PenaInfo]
    image_url: str | None = None
