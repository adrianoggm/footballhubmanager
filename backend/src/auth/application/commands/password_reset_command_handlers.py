"""Handlers for the forgot-password request and the password reset itself."""

from __future__ import annotations

import logging

from auth.application.commands.password_reset_commands import (
    RequestPasswordResetCommand,
    ResetPasswordCommand,
)
from auth.application.password_reset_tokens import load_usable_reset_token
from auth.application.services.account_email_composer import AccountEmailComposer
from auth.domain.errors import InvalidAccountTokenError, MailDeliveryError
from auth.domain.models.account_email import AccountEmail
from auth.domain.models.account_token import AccountToken, AccountTokenPurpose
from auth.domain.models.mail_language import MailLanguage
from auth.domain.policies.token_cooldown_policy import TokenCooldownPolicy
from auth.domain.ports.account_email_repository_port import AccountEmailRepositoryPort
from auth.domain.ports.clock_port import ClockPort
from auth.domain.ports.mail_sender_port import MailSenderPort
from auth.domain.ports.password_reset_token_repository_port import (
    PasswordResetTokenRepositoryPort,
)
from auth.domain.value_objects.email_address import EmailAddress
from auth.security import generate_account_token, hash_account_token, hash_password

logger = logging.getLogger(__name__)


class RequestPasswordResetHandler:
    """Never reveals whether the address belongs to an account.

    The handler returns the same (nothing) for unknown, unverified, throttled and
    successful requests, and never lets a delivery failure reach the caller.
    """

    def __init__(
        self,
        *,
        accounts: AccountEmailRepositoryPort,
        tokens: PasswordResetTokenRepositoryPort,
        mail_sender: MailSenderPort,
        composer: AccountEmailComposer,
        cooldown: TokenCooldownPolicy,
        clock: ClockPort,
        ttl_seconds: int,
    ) -> None:
        self._accounts = accounts
        self._tokens = tokens
        self._mail_sender = mail_sender
        self._composer = composer
        self._cooldown = cooldown
        self._clock = clock
        self._ttl_seconds = ttl_seconds

    def handle(self, command: RequestPasswordResetCommand) -> None:
        email = EmailAddress.parse(command.email)
        # Only verified addresses: an unverified one may not belong to the account owner.
        accounts = self._accounts.find_verified_by_email(email.value)
        if not accounts:
            logger.info("🔍 Password reset requested for an address with no verified account")
        for account in accounts:
            self._issue(account, command.lang)

    def _issue(self, account: AccountEmail, lang: MailLanguage) -> None:
        account_type = account.ref.account_type.value
        now = self._clock.now()
        if self._cooldown.is_cooling_down(self._tokens.last_issued_at(account.ref), now):
            logger.info(
                "🕐 Password reset for %s account %s skipped: cooldown active",
                account_type,
                account.guid,
            )
            return
        raw_token = generate_account_token()
        self._tokens.replace_token(
            AccountToken(
                token_hash=hash_account_token(raw_token),
                purpose=AccountTokenPurpose.PASSWORD_RESET,
                ref=account.ref,
                expires_at=now + self._ttl_seconds,
                created_at=now,
            )
        )
        try:
            self._mail_sender.send(
                self._composer.password_reset(
                    to=account.email or "",
                    username=account.username,
                    account_type=account_type,
                    token=raw_token,
                    ttl_seconds=self._ttl_seconds,
                    lang=lang,
                )
            )
        except MailDeliveryError:
            logger.error(
                "❌ Password reset email for %s account %s not delivered",
                account_type,
                account.guid,
            )
            return
        logger.info("📤 Password reset link issued for %s account %s", account_type, account.guid)


class ResetPasswordHandler:
    def __init__(
        self,
        *,
        accounts: AccountEmailRepositoryPort,
        tokens: PasswordResetTokenRepositoryPort,
        clock: ClockPort,
    ) -> None:
        self._accounts = accounts
        self._tokens = tokens
        self._clock = clock

    def handle(self, command: ResetPasswordCommand) -> None:
        token = load_usable_reset_token(self._tokens, command.token, self._clock.now())
        account = self._accounts.get_account_email(token.ref)
        if account is None:
            self._tokens.discard(token.token_hash)
            raise InvalidAccountTokenError()
        if not self._tokens.reset_password(token, hash_password(command.new_password)):
            raise InvalidAccountTokenError()
        logger.info(
            "🔐 Password reset for %s account %s; all its sessions revoked",
            token.ref.account_type.value,
            account.guid,
        )
