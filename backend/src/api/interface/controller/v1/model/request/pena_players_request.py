from pydantic import BaseModel


class UpdatePenaMembershipRequest(BaseModel):
    nickname: str | None = None
    position: str | None = None


class CreateGuestPlayerRequest(BaseModel):
    name: str
    surname1: str
    surname2: str | None = None
    nationality: str
    nickname: str | None = None
    position: str | None = None
