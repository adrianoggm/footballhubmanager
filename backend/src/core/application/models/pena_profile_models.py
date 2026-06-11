from dataclasses import dataclass


@dataclass(frozen=True)
class PenaProfileInfo:
    guid: str
    name: str
    image_url: str | None


@dataclass(frozen=True)
class PenaProfileUpdate:
    image_url: str | None = None
