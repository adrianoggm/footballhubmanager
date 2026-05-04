from pydantic import BaseModel, Field


class ConsumeLinkTokenRequest(BaseModel):
    token: str = Field(min_length=1)
    nickname: str | None = None
    position: str | None = None


class UpdatePenaProfileRequest(BaseModel):
    image_url: str | None = Field(default=None)
