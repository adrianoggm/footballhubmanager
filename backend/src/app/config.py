import logging
from pathlib import Path

from auth.infrastructure.mail.mail_sender_factory import MailBackend
from auth.infrastructure.mail.smtp_mail_sender import SmtpSecurity, SmtpSettings
from dotenv import load_dotenv
from pydantic import Field, ValidationError, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parents[2]
_ENV_FILES = [
    str(_BACKEND_DIR / "config" / ".local.env"),
    str(_BACKEND_DIR / "config" / ".env"),
]

# Also load the .env files into os.environ so settings read via os.getenv
# (not just the typed Configuration below) work in local runs. override=False
# keeps real env vars and test monkeypatching authoritative; loading
# .local.env first lets it win over .env for the same key.
for _env_file in _ENV_FILES:
    load_dotenv(_env_file, override=False)


class Configuration(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[
            str(_BACKEND_DIR / "config" / ".local.env"),
            str(_BACKEND_DIR / "config" / ".env"),
        ],
        case_sensitive=False,
        extra="ignore",
    )

    APP_HOST: str = Field(default="0.0.0.0")
    APP_PORT: int = Field(default=8000, ge=1, le=65535)
    APP_RELOAD: bool = Field(default=True)
    LINK_TOKEN_TTL_SECONDS: int = Field(default=86400, ge=60)

    # Account email (verification + password recovery, #154).
    APP_PUBLIC_URL: str = Field(default="http://localhost:5173")
    MAIL_BACKEND: MailBackend = Field(default=MailBackend.CONSOLE)
    SMTP_HOST: str | None = Field(default=None)
    SMTP_PORT: int = Field(default=587, ge=1, le=65535)
    SMTP_USERNAME: str | None = Field(default=None)
    SMTP_PASSWORD: str | None = Field(default=None)
    SMTP_FROM: str | None = Field(default=None)
    SMTP_SECURITY: SmtpSecurity = Field(default=SmtpSecurity.STARTTLS)
    PASSWORD_RESET_TOKEN_TTL_SECONDS: int = Field(default=3600, ge=300)
    EMAIL_VERIFICATION_TOKEN_TTL_SECONDS: int = Field(default=86400, ge=300)
    # Minimum gap between two emails of the same kind for one account.
    ACCOUNT_EMAIL_COOLDOWN_SECONDS: int = Field(default=60, ge=0)

    @model_validator(mode="after")
    def _require_smtp_settings(self) -> "Configuration":
        if self.MAIL_BACKEND is MailBackend.SMTP and not (self.SMTP_HOST and self.SMTP_FROM):
            raise ValueError("MAIL_BACKEND=smtp requires SMTP_HOST and SMTP_FROM")
        return self

    def smtp_settings(self) -> SmtpSettings | None:
        if not self.SMTP_HOST or not self.SMTP_FROM:
            return None
        return SmtpSettings(
            host=self.SMTP_HOST,
            port=self.SMTP_PORT,
            sender=self.SMTP_FROM,
            security=self.SMTP_SECURITY,
            username=self.SMTP_USERNAME or None,
            password=self.SMTP_PASSWORD or None,
        )


def initialize_config() -> Configuration:
    try:
        return Configuration()
    except ValidationError as e:
        logger = logging.getLogger(__name__)
        logger.error("Config validation error")
        logger.error(str(e))
        raise SystemExit(1)


# Initialize config
config = initialize_config()
