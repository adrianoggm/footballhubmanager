import pytest
from account_email_fakes import (
    ADMIN_REF,
    USER_REF,
    FakeAccounts,
    FakeClock,
    FakeMailSender,
    FakeTokens,
    account,
    raw_token_from_link,
)
from auth.application.commands.password_reset_command_handlers import (
    RequestPasswordResetHandler,
    ResetPasswordHandler,
)
from auth.application.commands.password_reset_commands import (
    RequestPasswordResetCommand,
    ResetPasswordCommand,
)
from auth.application.queries.password_reset_queries import InspectPasswordResetTokenQuery
from auth.application.queries.password_reset_query_handlers import (
    InspectPasswordResetTokenHandler,
)
from auth.application.services.account_email_composer import (
    RESET_PASSWORD_PATH,
    AccountEmailComposer,
)
from auth.domain.errors import (
    ExpiredAccountTokenError,
    InvalidAccountTokenError,
    MailDeliveryError,
)
from auth.domain.models.account_token import AccountTokenPurpose
from auth.domain.models.mail_language import MailLanguage
from auth.domain.policies.token_cooldown_policy import TokenCooldownPolicy
from auth.security import hash_account_token, verify_password


class _Env:
    def __init__(self, *accounts):
        self.clock = FakeClock()
        self.accounts = FakeAccounts({a.ref: a for a in accounts})
        self.tokens = FakeTokens(AccountTokenPurpose.PASSWORD_RESET, accounts=self.accounts)
        self.mail = FakeMailSender()

    def forgot(self):
        return RequestPasswordResetHandler(
            accounts=self.accounts,
            tokens=self.tokens,
            mail_sender=self.mail,
            composer=AccountEmailComposer("https://app.example.com"),
            cooldown=TokenCooldownPolicy(seconds=60),
            clock=self.clock,
            ttl_seconds=3600,
        )

    def reset(self):
        return ResetPasswordHandler(accounts=self.accounts, tokens=self.tokens, clock=self.clock)

    def inspect(self):
        return InspectPasswordResetTokenHandler(
            accounts=self.accounts, tokens=self.tokens, clock=self.clock
        )

    def request(self, email="ana@example.com"):
        return self.forgot().handle(RequestPasswordResetCommand(email=email, lang=MailLanguage.ES))

    def last_raw_token(self) -> str:
        return raw_token_from_link(self.mail.sent[-1].body, RESET_PASSWORD_PATH)


_VERIFIED_USER = account(USER_REF, email="ana@example.com", verified_at=5)


@pytest.mark.parametrize(
    "accounts",
    [
        (),  # unknown address
        (account(USER_REF, email="ana@example.com", verified_at=None),),  # unverified
    ],
)
def test_forgot_is_silent_for_unknown_or_unverified_email(accounts):
    env = _Env(*accounts)

    result = env.request()

    assert result is None
    assert env.mail.sent == []
    assert env.tokens.tokens == {}


def test_forgot_returns_same_result_and_sends_link_for_verified_account():
    env = _Env(_VERIFIED_USER)

    result = env.request("  ANA@example.com ")

    assert result is None
    assert [m.to for m in env.mail.sent] == ["ana@example.com"]
    raw = env.last_raw_token()
    token = env.tokens.find(hash_account_token(raw))
    assert token.ref == USER_REF
    assert token.expires_at == env.clock.current + 3600
    assert raw not in env.tokens.tokens


def test_forgot_sends_one_link_per_account_type_sharing_the_email():
    env = _Env(_VERIFIED_USER, account(ADMIN_REF, email="ana@example.com", verified_at=9))

    env.request()

    assert len(env.mail.sent) == 2
    refs = {t.ref for t in env.tokens.tokens.values()}
    assert refs == {USER_REF, ADMIN_REF}


def test_forgot_cooldown_silently_skips_and_new_request_invalidates_previous():
    env = _Env(_VERIFIED_USER)
    env.request()
    first = env.last_raw_token()

    env.clock.current += 30
    env.request()
    assert len(env.mail.sent) == 1

    env.clock.current += 30
    env.request()
    second = env.last_raw_token()
    assert first != second
    assert env.tokens.find(hash_account_token(first)) is None


def test_forgot_swallows_mail_failures():
    env = _Env(_VERIFIED_USER)
    env.mail.error = MailDeliveryError()

    assert env.request() is None


def test_inspect_token_returns_account_summary():
    env = _Env(_VERIFIED_USER)
    env.request()

    info = env.inspect().handle(InspectPasswordResetTokenQuery(token=env.last_raw_token()))

    assert info.username == "ana"
    assert info.account_type == "user"
    assert info.expires_at == env.clock.current + 3600


def test_inspect_token_rejects_unknown_and_expired():
    env = _Env(_VERIFIED_USER)
    with pytest.raises(InvalidAccountTokenError):
        env.inspect().handle(InspectPasswordResetTokenQuery(token="x" * 43))

    env.request()
    raw = env.last_raw_token()
    env.clock.current += 3600
    with pytest.raises(ExpiredAccountTokenError):
        env.inspect().handle(InspectPasswordResetTokenQuery(token=raw))
    assert env.tokens.find(hash_account_token(raw)) is None


def test_reset_password_hashes_password_revokes_sessions_and_is_single_use():
    env = _Env(_VERIFIED_USER)
    env.request()
    raw = env.last_raw_token()

    env.reset().handle(ResetPasswordCommand(token=raw, new_password="brand-new-password"))

    assert verify_password("brand-new-password", env.tokens.password_hashes[USER_REF])
    assert env.tokens.deleted_sessions_for == [USER_REF]
    with pytest.raises(InvalidAccountTokenError):
        env.reset().handle(ResetPasswordCommand(token=raw, new_password="another-password"))


def test_reset_password_rejects_expired_token():
    env = _Env(_VERIFIED_USER)
    env.request()
    raw = env.last_raw_token()
    env.clock.current += 4000

    with pytest.raises(ExpiredAccountTokenError):
        env.reset().handle(ResetPasswordCommand(token=raw, new_password="brand-new-password"))
    assert env.tokens.password_hashes == {}
