from pydantic import BaseModel, Field


class PlayerUpdateRequest(BaseModel):
    name: str | None = Field(default=None)
    surname1: str | None = Field(default=None)
    surname2: str | None = Field(default=None)
    nationality: str | None = Field(default=None)
