from typing import Literal

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


# Registration enforces a minimum password length; login does not, so accounts
# created before this policy can still authenticate.
MIN_PASSWORD_LENGTH = 12
MAX_EMAIL_LENGTH = 254

# Language of the emails the request triggers (verification / password reset).
MailLanguageCode = Literal["es", "en"]

_EMAIL_FIELD = Field(
    min_length=3,
    max_length=MAX_EMAIL_LENGTH,
    description="Email address; stored trimmed and lowercased",
    examples=["ana@example.com"],
)
_LANG_FIELD = Field(default="es", description="Language of the email sent (es | en)")
_TOKEN_FIELD = Field(min_length=16, max_length=128, description="Token from the emailed link")


class RegisterUserRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=MIN_PASSWORD_LENGTH)
    name: str = Field(min_length=1)
    surname1: str = Field(min_length=1)
    surname2: str | None = None
    nationality: str = Field(min_length=1)
    email: str = _EMAIL_FIELD
    lang: MailLanguageCode = _LANG_FIELD


class RegisterAdminRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=MIN_PASSWORD_LENGTH)
    name: str = Field(min_length=1)
    email: str = _EMAIL_FIELD
    lang: MailLanguageCode = _LANG_FIELD


class ChangeAccountEmailRequest(BaseModel):
    email: str = _EMAIL_FIELD
    lang: MailLanguageCode = _LANG_FIELD


class ResendEmailVerificationRequest(BaseModel):
    lang: MailLanguageCode = _LANG_FIELD


class VerifyEmailRequest(BaseModel):
    token: str = _TOKEN_FIELD


class ForgotPasswordRequest(BaseModel):
    email: str = _EMAIL_FIELD
    lang: MailLanguageCode = _LANG_FIELD


class PasswordResetTokenRequest(BaseModel):
    token: str = _TOKEN_FIELD


class ResetPasswordRequest(BaseModel):
    token: str = _TOKEN_FIELD
    new_password: str = Field(min_length=MIN_PASSWORD_LENGTH)
