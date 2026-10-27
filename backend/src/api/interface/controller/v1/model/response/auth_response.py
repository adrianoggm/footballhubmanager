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
    email: str | None = None
    email_verified: bool = False


class AccountEmailResponse(BaseModel):
    email: str | None
    email_verified: bool
    # Only meaningful on PUT /auth/me/email: False when the change was saved but the
    # verification email was deferred by the resend cooldown.
    verification_email_sent: bool = False


class AuthStatusResponse(BaseModel):
    status: str


class PasswordResetTokenInfoResponse(BaseModel):
    username: str
    account_type: str
    expires_at: int
