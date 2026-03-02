from pydantic import BaseModel


class PenaPlayerResponse(BaseModel):
    guid: str
    name: str
    surname1: str
    surname2: str | None
    nationality: str
    nickname: str | None
    position: str | None


class PenaPlayersPageResponse(BaseModel):
    items: list[PenaPlayerResponse]
    page: int
    page_size: int
    total: int
    total_pages: int


class PenaMembershipResponse(BaseModel):
    pena_guid: str
    player_guid: str
    name: str
    surname1: str
    surname2: str | None
    nationality: str
    nickname: str | None
    position: str | None
    role: str
