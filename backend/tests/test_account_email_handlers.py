import pytest
from account_email_fakes import (
    USER_REF,
    FakeAccounts,
    FakeClock,
    FakeMailSender,
    FakeTokens,
    account,
    make_issuer,
    raw_token_from_link,
)
from auth.application.commands.account_email_command_handlers import (
    ChangeAccountEmailHandler,
    ResendEmailVerificationHandler,
    SendRegistrationEmailVerificationHandler,
    VerifyEmailHandler,
)
from auth.application.commands.account_email_commands import (
    ChangeAccountEmailCommand,
    ResendEmailVerificationCommand,
    SendRegistrationEmailVerificationCommand,
    VerifyEmailCommand,
)
from auth.application.queries.account_email_queries import GetAccountEmailQuery
from auth.application.queries.account_email_query_handlers import GetAccountEmailHandler
from auth.application.services.account_email_composer import VERIFY_EMAIL_PATH
from auth.domain.errors import (
    AccountEmailAlreadyVerifiedError,
    AccountEmailInUseError,
    AccountEmailMissingError,
    AccountNotFoundError,
    AccountTokenCooldownError,
    ExpiredAccountTokenError,
    InvalidAccountTokenError,
    InvalidEmailError,
    MailDeliveryError,
)
from auth.domain.models.account_token import AccountTokenPurpose
from auth.domain.models.mail_language import MailLanguage
from auth.domain.policies.token_cooldown_policy import TokenCooldownPolicy
from auth.security import hash_account_token


class _Env:
    def __init__(self, *accounts):
        self.clock = FakeClock()
        self.accounts = FakeAccounts({a.ref: a for a in accounts})
        self.tokens = FakeTokens(AccountTokenPurpose.EMAIL_VERIFICATION, accounts=self.accounts)
        self.mail = FakeMailSender()
        self.issuer = make_issuer(self.tokens, self.mail, self.clock)
        self.cooldown = TokenCooldownPolicy(seconds=60)

    def change(self):
        return ChangeAccountEmailHandler(
            accounts=self.accounts,
            tokens=self.tokens,
            issuer=self.issuer,
            cooldown=self.cooldown,
            clock=self.clock,
        )

    def resend(self):
        return ResendEmailVerificationHandler(
            accounts=self.accounts,
            tokens=self.tokens,
            issuer=self.issuer,
            cooldown=self.cooldown,
            clock=self.clock,
        )

    def verify(self):
        return VerifyEmailHandler(accounts=self.accounts, tokens=self.tokens, clock=self.clock)

    def last_raw_token(self) -> str:
        return raw_token_from_link(self.mail.sent[-1].body, VERIFY_EMAIL_PATH)


def test_change_email_normalizes_resets_verification_and_sends_link():
    env = _Env(account(email="old@example.com", verified_at=5))

    result = env.change().handle(
        ChangeAccountEmailCommand(ref=USER_REF, email="  New@Example.COM ", lang=MailLanguage.EN)
    )

    assert result.email == "new@example.com"
    assert result.email_verified is False
    assert result.verification_email_sent is True
    assert env.accounts.accounts[USER_REF].email_verified_at is None
    sent = env.mail.sent[0]
    assert sent.to == "new@example.com"
    assert "confirm your email" in sent.subject
    raw = env.last_raw_token()
    stored = env.tokens.find(hash_account_token(raw))
    assert stored.email == "new@example.com"
    assert stored.expires_at == env.clock.current + 86400
    # Only the hash is kept.
    assert raw not in env.tokens.tokens


def test_change_to_same_verified_email_is_a_no_op():
    env = _Env(account(email="ana@example.com", verified_at=5))

    result = env.change().handle(
        ChangeAccountEmailCommand(ref=USER_REF, email="ANA@example.com", lang=MailLanguage.ES)
    )

    assert result.email_verified is True
    assert env.mail.sent == []


def test_change_email_rejects_invalid_address():
    env = _Env(account())
    with pytest.raises(InvalidEmailError):
        env.change().handle(
            ChangeAccountEmailCommand(ref=USER_REF, email="not-an-email", lang=MailLanguage.ES)
        )


def test_change_email_propagates_conflict_and_sends_nothing():
    env = _Env(account(email=None))
    env.accounts.taken_emails.add("taken@example.com")

    with pytest.raises(AccountEmailInUseError):
        env.change().handle(
            ChangeAccountEmailCommand(ref=USER_REF, email="taken@example.com", lang=MailLanguage.ES)
        )
    assert env.mail.sent == []


def test_change_email_within_cooldown_saves_address_but_defers_the_email():
    # QA F8: a second change inside the resend window must still save the address;
    # only the verification email is throttled (the user resends it later).
    env = _Env(account(email=None))
    handler = env.change()
    first = handler.handle(ChangeAccountEmailCommand(USER_REF, "a@example.com", MailLanguage.ES))
    assert first.verification_email_sent is True
    env.clock.current += 30

    second = handler.handle(ChangeAccountEmailCommand(USER_REF, "b@example.com", MailLanguage.ES))

    assert second.email == "b@example.com"
    assert second.email_verified is False
    assert second.verification_email_sent is False
    assert env.accounts.accounts[USER_REF].email == "b@example.com"
    assert [m.to for m in env.mail.sent] == ["a@example.com"]
    # The link mailed for the previous address no longer verifies the account.
    with pytest.raises(InvalidAccountTokenError):
        env.verify().handle(VerifyEmailCommand(env.last_raw_token()))

    # Once the window is over the user can resend to the new address.
    env.clock.current += 31
    env.resend().handle(ResendEmailVerificationCommand(USER_REF, MailLanguage.ES))
    assert [m.to for m in env.mail.sent] == ["a@example.com", "b@example.com"]


def test_change_email_after_cooldown_sends_the_link_again():
    env = _Env(account(email=None))
    handler = env.change()
    handler.handle(ChangeAccountEmailCommand(USER_REF, "a@example.com", MailLanguage.ES))
    env.clock.current += 61

    result = handler.handle(ChangeAccountEmailCommand(USER_REF, "b@example.com", MailLanguage.ES))

    assert result.verification_email_sent is True
    assert [m.to for m in env.mail.sent] == ["a@example.com", "b@example.com"]


def test_change_email_unknown_account():
    env = _Env()
    with pytest.raises(AccountNotFoundError):
        env.change().handle(ChangeAccountEmailCommand(USER_REF, "a@example.com", MailLanguage.ES))


def test_resend_requires_unverified_email():
    with pytest.raises(AccountEmailMissingError):
        _Env(account(email=None)).resend().handle(
            ResendEmailVerificationCommand(USER_REF, MailLanguage.ES)
        )
    with pytest.raises(AccountEmailAlreadyVerifiedError):
        _Env(account(verified_at=5)).resend().handle(
            ResendEmailVerificationCommand(USER_REF, MailLanguage.ES)
        )


def test_resend_replaces_previous_token_and_honours_cooldown():
    env = _Env(account())
    handler = env.resend()
    handler.handle(ResendEmailVerificationCommand(USER_REF, MailLanguage.ES))
    first = env.last_raw_token()

    with pytest.raises(AccountTokenCooldownError):
        handler.handle(ResendEmailVerificationCommand(USER_REF, MailLanguage.ES))

    env.clock.current += 60
    handler.handle(ResendEmailVerificationCommand(USER_REF, MailLanguage.ES))
    second = env.last_raw_token()
    assert first != second
    assert env.tokens.find(hash_account_token(first)) is None
    assert env.tokens.find(hash_account_token(second)) is not None
    assert "confirma tu email" in env.mail.sent[-1].subject


def test_resend_surfaces_mail_failure():
    env = _Env(account())
    env.mail.error = MailDeliveryError()
    with pytest.raises(MailDeliveryError):
        env.resend().handle(ResendEmailVerificationCommand(USER_REF, MailLanguage.ES))


def test_registration_verification_is_best_effort():
    env = _Env(account())
    env.mail.error = MailDeliveryError()
    handler = SendRegistrationEmailVerificationHandler(accounts=env.accounts, issuer=env.issuer)

    handler.handle(SendRegistrationEmailVerificationCommand(USER_REF, MailLanguage.ES))

    env.mail.error = None
    handler.handle(SendRegistrationEmailVerificationCommand(USER_REF, MailLanguage.ES))
    assert len(env.mail.sent) == 1


def test_registration_verification_skips_accounts_without_email():
    env = _Env(account(email=None))
    SendRegistrationEmailVerificationHandler(accounts=env.accounts, issuer=env.issuer).handle(
        SendRegistrationEmailVerificationCommand(USER_REF, MailLanguage.ES)
    )
    assert env.mail.sent == []


def test_verify_email_marks_account_verified_once():
    env = _Env(account())
    env.resend().handle(ResendEmailVerificationCommand(USER_REF, MailLanguage.ES))
    raw = env.last_raw_token()

    env.verify().handle(VerifyEmailCommand(token=raw))

    assert env.accounts.accounts[USER_REF].email_verified_at == env.clock.current
    with pytest.raises(InvalidAccountTokenError):
        env.verify().handle(VerifyEmailCommand(token=raw))


def test_verify_email_rejects_unknown_token():
    with pytest.raises(InvalidAccountTokenError):
        _Env(account()).verify().handle(VerifyEmailCommand(token="x" * 43))


def test_verify_email_rejects_and_discards_expired_token():
    env = _Env(account())
    env.resend().handle(ResendEmailVerificationCommand(USER_REF, MailLanguage.ES))
    raw = env.last_raw_token()
    env.clock.current += 86400

    with pytest.raises(ExpiredAccountTokenError):
        env.verify().handle(VerifyEmailCommand(token=raw))
    assert env.tokens.find(hash_account_token(raw)) is None


def test_verify_email_rejects_link_for_previous_address():
    env = _Env(account(email="old@example.com"))
    env.resend().handle(ResendEmailVerificationCommand(USER_REF, MailLanguage.ES))
    raw = env.last_raw_token()
    # Email changed through another path after the link was sent.
    env.accounts.accounts[USER_REF] = account(email="new@example.com")

    with pytest.raises(InvalidAccountTokenError):
        env.verify().handle(VerifyEmailCommand(token=raw))
    assert env.accounts.accounts[USER_REF].email_verified_at is None


def test_get_account_email_query():
    env = _Env(account(verified_at=7))
    result = GetAccountEmailHandler(env.accounts).handle(GetAccountEmailQuery(ref=USER_REF))
    assert result.email == "ana@example.com"
    assert result.email_verified is True

    with pytest.raises(AccountNotFoundError):
        GetAccountEmailHandler(FakeAccounts()).handle(GetAccountEmailQuery(ref=USER_REF))
