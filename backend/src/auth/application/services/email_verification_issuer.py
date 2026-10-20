"""Issues a fresh email-verification token and emails the link."""

from __future__ import annotations

import logging

from auth.application.services.account_email_composer import AccountEmailComposer
from auth.domain.errors import AccountEmailMissingError
from auth.domain.models.account_email import AccountEmail
from auth.domain.models.account_token import AccountToken, AccountTokenPurpose
from auth.domain.models.mail_language import MailLanguage
from auth.domain.ports.clock_port import ClockPort
from auth.domain.ports.email_verification_token_repository_port import (
    EmailVerificationTokenRepositoryPort,
)
from auth.domain.ports.mail_sender_port import MailSenderPort
from auth.security import generate_account_token, hash_account_token

logger = logging.getLogger(__name__)


class EmailVerificationIssuer:
    def __init__(
        self,
        *,
        tokens: EmailVerificationTokenRepositoryPort,
        mail_sender: MailSenderPort,
        composer: AccountEmailComposer,
        clock: ClockPort,
        ttl_seconds: int,
    ) -> None:
        self._tokens = tokens
        self._mail_sender = mail_sender
        self._composer = composer
        self._clock = clock
        self._ttl_seconds = ttl_seconds

    def issue(self, account: AccountEmail, lang: MailLanguage) -> None:
        """Replace any pending verification token of the account and send a new link.

        Raises ``MailDeliveryError`` when the email cannot be delivered; the token is
        already stored by then, so a later resend simply replaces it.
        """
        if account.email is None:
            raise AccountEmailMissingError()
        raw_token = generate_account_token()
        now = self._clock.now()
        self._tokens.replace_token(
            AccountToken(
                token_hash=hash_account_token(raw_token),
                purpose=AccountTokenPurpose.EMAIL_VERIFICATION,
                ref=account.ref,
                email=account.email,
                expires_at=now + self._ttl_seconds,
                created_at=now,
            )
        )
        self._mail_sender.send(
            self._composer.email_verification(
                to=account.email,
                username=account.username,
                token=raw_token,
                ttl_seconds=self._ttl_seconds,
                lang=lang,
            )
        )
        logger.info(
            "📤 Email verification link sent for %s account %s",
            account.ref.account_type.value,
            account.guid,
        )
