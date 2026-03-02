from pydantic import BaseModel


class PenaInfoResponse(BaseModel):
    guid: str
    name: str


class PlayerProfileResponse(BaseModel):
    guid: str
    name: str
    surname1: str
    surname2: str | None
    nationality: str
    penas: list[PenaInfoResponse]
