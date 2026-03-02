from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class RegisterUserRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)
    name: str = Field(min_length=1)
    surname1: str = Field(min_length=1)
    surname2: str | None = None
    nationality: str = Field(min_length=1)


class RegisterAdminRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)
    name: str = Field(min_length=1)
