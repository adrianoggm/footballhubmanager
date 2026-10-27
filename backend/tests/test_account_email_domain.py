import pytest
from auth.application.services.account_email_composer import AccountEmailComposer
from auth.domain.errors import AccountTokenCooldownError, InvalidEmailError
from auth.domain.models.mail_language import MailLanguage
from auth.domain.policies.token_cooldown_policy import TokenCooldownPolicy
from auth.domain.value_objects.email_address import EmailAddress
from auth.security import generate_account_token, hash_account_token


def test_email_address_normalizes():
    assert EmailAddress.parse("  Ana.Lopez@Example.COM ").value == "ana.lopez@example.com"


@pytest.mark.parametrize(
    "raw", ["", "ana", "ana@", "@example.com", "ana@example", "a b@example.com", "a@@b.com"]
)
def test_email_address_rejects_invalid(raw):
    with pytest.raises(InvalidEmailError):
        EmailAddress.parse(raw)


def test_email_address_rejects_too_long():
    with pytest.raises(InvalidEmailError):
        EmailAddress.parse("a" * 250 + "@example.com")


def test_cooldown_policy():
    policy = TokenCooldownPolicy(seconds=60)
    assert policy.is_cooling_down(None, 100) is False
    assert policy.is_cooling_down(100, 159) is True
    assert policy.is_cooling_down(100, 160) is False
    with pytest.raises(AccountTokenCooldownError):
        policy.ensure_ready(100, 120)
    policy.ensure_ready(None, 120)


def test_token_hash_is_sha256_hex_and_tokens_are_random():
    token = generate_account_token()
    assert token != generate_account_token()
    digest = hash_account_token(token)
    assert len(digest) == 64
    assert digest == hash_account_token(token)
    assert token not in digest


def test_composer_builds_bilingual_links():
    composer = AccountEmailComposer("https://app.example.com/")

    es = composer.email_verification(
        to="a@example.com", username="ana", token="tok", ttl_seconds=86400, lang=MailLanguage.ES
    )
    en = composer.password_reset(
        to="a@example.com",
        username="ana",
        account_type="admin",
        token="tok",
        ttl_seconds=3600,
        lang=MailLanguage.EN,
    )

    assert "https://app.example.com/verify-email/tok" in es.body
    assert "24 horas" in es.body
    assert "https://app.example.com/reset-password/tok" in en.body
    assert "1 hour" in en.body
    assert "admin account" in en.body
    assert en.subject.endswith("reset your password")


def test_composer_subjects_use_the_product_name():
    # QA F10: mails must carry the same brand as the UI (i18n ``app.brand``).
    composer = AccountEmailComposer("https://app.example.com")
    for lang in MailLanguage:
        verification = composer.email_verification(
            to="a@example.com", username="ana", token="tok", ttl_seconds=3600, lang=lang
        )
        reset = composer.password_reset(
            to="a@example.com",
            username="ana",
            account_type="user",
            token="tok",
            ttl_seconds=3600,
            lang=lang,
        )
        for email in (verification, reset):
            assert email.subject.startswith("footballhubmanager: ")
            assert "PeñaHub" not in email.subject + email.body


def test_composer_formats_minutes():
    composer = AccountEmailComposer("https://app.example.com")
    email = composer.password_reset(
        to="a@example.com",
        username="ana",
        account_type="user",
        token="tok",
        ttl_seconds=1800,
        lang=MailLanguage.ES,
    )
    assert "30 minutos" in email.body
    assert "(usuario)" in email.body
