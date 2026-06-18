from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


# Registration enforces a minimum password length; login does not, so accounts
# created before this policy can still authenticate.
MIN_PASSWORD_LENGTH = 12


class RegisterUserRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=MIN_PASSWORD_LENGTH)
    name: str = Field(min_length=1)
    surname1: str = Field(min_length=1)
    surname2: str | None = None
    nationality: str = Field(min_length=1)


class RegisterAdminRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=MIN_PASSWORD_LENGTH)
    name: str = Field(min_length=1)
