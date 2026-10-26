"""In-memory fakes shared by the account email / password reset handler tests."""

from __future__ import annotations

from dataclasses import dataclass, field, replace

from auth.application.services.account_email_composer import AccountEmailComposer
from auth.application.services.email_verification_issuer import EmailVerificationIssuer
from auth.domain.errors import AccountEmailInUseError, AccountNotFoundError
from auth.domain.models.account_email import AccountEmail, AccountRef, AccountType
from auth.domain.models.account_token import AccountToken, AccountTokenPurpose

USER_REF = AccountRef(account_type=AccountType.USER, account_id=1)
ADMIN_REF = AccountRef(account_type=AccountType.ADMIN, account_id=1)


def account(
    ref: AccountRef = USER_REF,
    *,
    email: str | None = "ana@example.com",
    verified_at: int | None = None,
    username: str = "ana",
) -> AccountEmail:
    return AccountEmail(
        ref=ref,
        guid=f"{ref.account_type.value}-guid-{ref.account_id}",
        username=username,
        email=email,
        email_verified_at=verified_at,
    )


@dataclass
class FakeClock:
    current: int = 10_000

    def now(self) -> int:
        return self.current


@dataclass
class FakeAccounts:
    accounts: dict[AccountRef, AccountEmail] = field(default_factory=dict)
    taken_emails: set[str] = field(default_factory=set)

    def get_account_email(self, ref: AccountRef) -> AccountEmail | None:
        return self.accounts.get(ref)

    def find_verified_by_email(self, email: str) -> list[AccountEmail]:
        return [a for a in self.accounts.values() if a.is_verified and a.email == email]

    def set_unverified_email(self, ref: AccountRef, email: str) -> None:
        if ref not in self.accounts:
            raise AccountNotFoundError()
        if email in self.taken_emails:
            raise AccountEmailInUseError()
        self.accounts[ref] = replace(self.accounts[ref], email=email, email_verified_at=None)


@dataclass
class FakeTokens:
    purpose: AccountTokenPurpose
    tokens: dict[str, AccountToken] = field(default_factory=dict)
    accounts: FakeAccounts | None = None
    password_hashes: dict[AccountRef, str] = field(default_factory=dict)
    deleted_sessions_for: list[AccountRef] = field(default_factory=list)

    def replace_token(self, token: AccountToken) -> None:
        self.tokens = {h: t for h, t in self.tokens.items() if t.ref != token.ref}
        self.tokens[token.token_hash] = token

    def last_issued_at(self, ref: AccountRef) -> int | None:
        times = [t.created_at for t in self.tokens.values() if t.ref == ref]
        return max(times) if times else None

    def find(self, token_hash: str) -> AccountToken | None:
        return self.tokens.get(token_hash)

    def discard(self, token_hash: str) -> None:
        self.tokens.pop(token_hash, None)

    def confirm_email(self, token: AccountToken, verified_at: int) -> bool:
        if self.tokens.pop(token.token_hash, None) is None:
            return False
        current = self.accounts.accounts[token.ref]
        self.accounts.accounts[token.ref] = replace(current, email_verified_at=verified_at)
        return True

    def reset_password(self, token: AccountToken, password_hash: str) -> bool:
        if self.tokens.pop(token.token_hash, None) is None:
            return False
        self.tokens = {h: t for h, t in self.tokens.items() if t.ref != token.ref}
        self.password_hashes[token.ref] = password_hash
        self.deleted_sessions_for.append(token.ref)
        return True


@dataclass
class FakeMailSender:
    sent: list = field(default_factory=list)
    error: Exception | None = None

    def send(self, email) -> None:
        if self.error is not None:
            raise self.error
        self.sent.append(email)


def raw_token_from_link(body: str, path: str) -> str:
    start = body.index(path) + len(path)
    return body[start:].split()[0]


def make_issuer(tokens, mail, clock, ttl_seconds: int = 86400) -> EmailVerificationIssuer:
    return EmailVerificationIssuer(
        tokens=tokens,
        mail_sender=mail,
        composer=AccountEmailComposer("https://app.example.com/"),
        clock=clock,
        ttl_seconds=ttl_seconds,
    )
