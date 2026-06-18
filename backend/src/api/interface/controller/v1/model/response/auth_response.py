from pydantic import BaseModel


class LoginResponse(BaseModel):
    token: str
    token_type: str
    expires_at: int
    user_guid: str
    user_type: str


class SessionResponse(BaseModel):
    """Non-sensitive session metadata; the token itself lives only in the cookie."""

    expires_at: int
    user_guid: str
    user_type: str
