from pydantic import BaseModel


class PenaResponse(BaseModel):
    guid: str
    name: str
    image_url: str | None = None


class PenasPageResponse(BaseModel):
    items: list[PenaResponse]
    page: int
    page_size: int
    total: int
    total_pages: int


class LinkTokenResponse(BaseModel):
    token: str
    pena_guid: str
    expires_at: int
