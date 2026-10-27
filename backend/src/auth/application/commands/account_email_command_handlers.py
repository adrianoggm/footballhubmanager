"""Handlers for setting, re-sending and confirming an account email."""

from __future__ import annotations

import logging

from auth.application.commands.account_email_commands import (
    ChangeAccountEmailCommand,
    ResendEmailVerificationCommand,
    SendRegistrationEmailVerificationCommand,
    VerifyEmailCommand,
)
from auth.application.queries.account_email_queries import AccountEmailStatusResult
from auth.application.services.email_verification_issuer import EmailVerificationIssuer
from auth.domain.errors import (
    AccountEmailAlreadyVerifiedError,
    AccountEmailMissingError,
    AccountNotFoundError,
    ExpiredAccountTokenError,
    InvalidAccountTokenError,
    MailDeliveryError,
)
from auth.domain.models.account_email import AccountEmail, AccountRef
from auth.domain.policies.token_cooldown_policy import TokenCooldownPolicy
from auth.domain.ports.account_email_repository_port import AccountEmailRepositoryPort
from auth.domain.ports.clock_port import ClockPort
from auth.domain.ports.email_verification_token_repository_port import (
    EmailVerificationTokenRepositoryPort,
)
from auth.domain.value_objects.email_address import EmailAddress
from auth.security import hash_account_token

logger = logging.getLogger(__name__)


def _require_account(accounts: AccountEmailRepositoryPort, ref: AccountRef) -> AccountEmail:
    account = accounts.get_account_email(ref)
    if account is None:
        raise AccountNotFoundError()
    return account


class ChangeAccountEmailHandler:
    def __init__(
        self,
        *,
        accounts: AccountEmailRepositoryPort,
        tokens: EmailVerificationTokenRepositoryPort,
        issuer: EmailVerificationIssuer,
        cooldown: TokenCooldownPolicy,
        clock: ClockPort,
    ) -> None:
        self._accounts = accounts
        self._tokens = tokens
        self._issuer = issuer
        self._cooldown = cooldown
        self._clock = clock

    def handle(self, command: ChangeAccountEmailCommand) -> AccountEmailStatusResult:
        email = EmailAddress.parse(command.email)
        account = _require_account(self._accounts, command.ref)
        if account.has_verified_email(email.value):
            return AccountEmailStatusResult(email=email.value, email_verified=True)

        self._accounts.set_unverified_email(command.ref, email.value)
        logger.info(
            "📝 Email changed for %s account %s; verification pending",
            command.ref.account_type.value,
            account.guid,
        )
        # The change is always saved; only the verification mail shares the resend
        # throttle, so the endpoint cannot be used to spam arbitrary inboxes. Any
        # link mailed for the previous address stops working (it no longer matches).
        if self._cooldown.is_cooling_down(
            self._tokens.last_issued_at(command.ref), self._clock.now()
        ):
            logger.info(
                "🕐 Verification email for %s account %s deferred: cooldown active",
                command.ref.account_type.value,
                account.guid,
            )
            return AccountEmailStatusResult(
                email=email.value, email_verified=False, verification_email_sent=False
            )
        updated = _require_account(self._accounts, command.ref)
        self._issuer.issue(updated, command.lang)
        return AccountEmailStatusResult(
            email=email.value, email_verified=False, verification_email_sent=True
        )


class ResendEmailVerificationHandler:
    def __init__(
        self,
        *,
        accounts: AccountEmailRepositoryPort,
        tokens: EmailVerificationTokenRepositoryPort,
        issuer: EmailVerificationIssuer,
        cooldown: TokenCooldownPolicy,
        clock: ClockPort,
    ) -> None:
        self._accounts = accounts
        self._tokens = tokens
        self._issuer = issuer
        self._cooldown = cooldown
        self._clock = clock

    def handle(self, command: ResendEmailVerificationCommand) -> None:
        account = _require_account(self._accounts, command.ref)
        if account.email is None:
            raise AccountEmailMissingError()
        if account.is_verified:
            raise AccountEmailAlreadyVerifiedError()
        self._cooldown.ensure_ready(self._tokens.last_issued_at(command.ref), self._clock.now())
        self._issuer.issue(account, command.lang)


class SendRegistrationEmailVerificationHandler:
    """Sign-up already succeeded; a mail outage must not undo it. The user can resend."""

    def __init__(
        self, *, accounts: AccountEmailRepositoryPort, issuer: EmailVerificationIssuer
    ) -> None:
        self._accounts = accounts
        self._issuer = issuer

    def handle(self, command: SendRegistrationEmailVerificationCommand) -> None:
        account = self._accounts.get_account_email(command.ref)
        if account is None or account.email is None:
            logger.warning(
                "⚠️ No email to verify for new %s account id %s",
                command.ref.account_type.value,
                command.ref.account_id,
            )
            return
        try:
            self._issuer.issue(account, command.lang)
        except MailDeliveryError:
            logger.warning(
                "⚠️ Verification email for new %s account %s not delivered; user can resend",
                command.ref.account_type.value,
                account.guid,
            )


class VerifyEmailHandler:
    def __init__(
        self,
        *,
        accounts: AccountEmailRepositoryPort,
        tokens: EmailVerificationTokenRepositoryPort,
        clock: ClockPort,
    ) -> None:
        self._accounts = accounts
        self._tokens = tokens
        self._clock = clock

    def handle(self, command: VerifyEmailCommand) -> None:
        token_hash = hash_account_token(command.token)
        token = self._tokens.find(token_hash)
        if token is None:
            raise InvalidAccountTokenError()
        now = self._clock.now()
        if token.is_expired(now):
            self._tokens.discard(token_hash)
            raise ExpiredAccountTokenError()

        account = self._accounts.get_account_email(token.ref)
        if account is None or not token.is_for_email(account.email):
            self._tokens.discard(token_hash)
            raise InvalidAccountTokenError()
        if not self._tokens.confirm_email(token, verified_at=now):
            raise InvalidAccountTokenError()
        logger.info(
            "✅ Email verified for %s account %s", token.ref.account_type.value, account.guid
        )
