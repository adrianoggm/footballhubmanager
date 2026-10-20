import logging
import smtplib
from concurrent.futures import Future

import pytest
from app.config import Configuration
from auth.domain.errors import MailDeliveryError
from auth.domain.models.outgoing_email import OutgoingEmail
from auth.infrastructure.mail import smtp_mail_sender
from auth.infrastructure.mail.background_mail_sender import BackgroundMailSender
from auth.infrastructure.mail.console_mail_sender import ConsoleMailSender
from auth.infrastructure.mail.mail_sender_factory import MailBackend, build_mail_sender
from auth.infrastructure.mail.smtp_mail_sender import SmtpMailSender, SmtpSecurity, SmtpSettings

_EMAIL = OutgoingEmail(to="ana@example.com", subject="Hello", body="Open https://x/y/abc")


def test_console_sender_logs_recipient_subject_and_body(caplog):
    with caplog.at_level(logging.INFO):
        ConsoleMailSender().send(_EMAIL)

    assert "ana@example.com" in caplog.text
    assert "Hello" in caplog.text
    assert "https://x/y/abc" in caplog.text


class _FakeSmtp:
    instances: list["_FakeSmtp"] = []

    def __init__(self, host, port, timeout=None, context=None):
        self.host = host
        self.port = port
        self.started_tls = False
        self.logged_in: tuple[str, str] | None = None
        self.sent = []
        _FakeSmtp.instances.append(self)

    def __enter__(self):
        return self

    def __exit__(self, *_exc):
        return False

    def starttls(self, context=None):
        self.started_tls = True

    def login(self, username, password):
        self.logged_in = (username, password)

    def send_message(self, message):
        self.sent.append(message)


def _settings(security: SmtpSecurity, username: str | None = "mailer") -> SmtpSettings:
    return SmtpSettings(
        host="smtp.example.com",
        port=587,
        sender="no-reply@example.com",
        security=security,
        username=username,
        password="secret",
    )


def test_smtp_sender_uses_starttls_and_login(monkeypatch):
    _FakeSmtp.instances.clear()
    monkeypatch.setattr(smtp_mail_sender.smtplib, "SMTP", _FakeSmtp)

    SmtpMailSender(_settings(SmtpSecurity.STARTTLS)).send(_EMAIL)

    client = _FakeSmtp.instances[0]
    assert client.started_tls is True
    assert client.logged_in == ("mailer", "secret")
    message = client.sent[0]
    assert message["To"] == "ana@example.com"
    assert message["From"] == "no-reply@example.com"
    assert message["Subject"] == "Hello"
    assert "https://x/y/abc" in message.get_content()


def test_smtp_sender_ssl_mode_uses_smtp_ssl_without_login(monkeypatch):
    _FakeSmtp.instances.clear()
    monkeypatch.setattr(smtp_mail_sender.smtplib, "SMTP_SSL", _FakeSmtp)

    SmtpMailSender(_settings(SmtpSecurity.SSL, username=None)).send(_EMAIL)

    client = _FakeSmtp.instances[0]
    assert client.started_tls is False
    assert client.logged_in is None
    assert len(client.sent) == 1


def test_smtp_sender_wraps_failures_in_mail_delivery_error(monkeypatch):
    class _Broken(_FakeSmtp):
        def send_message(self, message):
            raise smtplib.SMTPRecipientsRefused({})

    monkeypatch.setattr(smtp_mail_sender.smtplib, "SMTP", _Broken)

    with pytest.raises(MailDeliveryError):
        SmtpMailSender(_settings(SmtpSecurity.NONE)).send(_EMAIL)


class _InlineExecutor:
    def submit(self, fn, *args):
        future: Future = Future()
        fn(*args)
        future.set_result(None)
        return future


def test_background_sender_delegates_and_swallows_failures(caplog):
    delivered = []

    class _Inner:
        def send(self, email):
            delivered.append(email)
            raise MailDeliveryError()

    sender = BackgroundMailSender(_Inner(), executor=_InlineExecutor())
    with caplog.at_level(logging.ERROR):
        sender.send(_EMAIL)

    assert delivered == [_EMAIL]
    assert "Background email delivery failed" in caplog.text


def test_factory_selects_backend():
    assert isinstance(build_mail_sender(MailBackend.CONSOLE, None), ConsoleMailSender)
    assert isinstance(
        build_mail_sender(MailBackend.SMTP, _settings(SmtpSecurity.STARTTLS)), SmtpMailSender
    )
    with pytest.raises(ValueError):
        build_mail_sender(MailBackend.SMTP, None)


def test_configuration_requires_smtp_host_and_sender_for_smtp_backend():
    with pytest.raises(ValueError):
        Configuration(MAIL_BACKEND="smtp", SMTP_HOST="", SMTP_FROM="")

    config = Configuration(
        MAIL_BACKEND="smtp", SMTP_HOST="smtp.example.com", SMTP_FROM="no-reply@example.com"
    )
    settings = config.smtp_settings()
    assert settings is not None
    assert settings.host == "smtp.example.com"
    assert settings.security is SmtpSecurity.STARTTLS
