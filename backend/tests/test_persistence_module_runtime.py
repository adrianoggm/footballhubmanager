import pytest
from persistence import module as persistence_module


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        (None, None),
        ("1", True),
        ("true", True),
        (" YES ", True),
        ("on", True),
        ("0", False),
        ("false", False),
        (" no ", False),
        ("off", False),
        ("maybe", None),
    ],
)
def test_parse_bool(raw, expected):
    assert persistence_module._parse_bool(raw) is expected


def test_resolve_sql_echo_prefers_explicit_true(monkeypatch):
    monkeypatch.setattr(persistence_module.config, "SQL_ECHO", "true")
    monkeypatch.setattr(persistence_module.config, "APP_ENV", "production")
    assert persistence_module._resolve_sql_echo() is True


def test_resolve_sql_echo_prefers_explicit_false(monkeypatch):
    monkeypatch.setattr(persistence_module.config, "SQL_ECHO", "false")
    monkeypatch.setattr(persistence_module.config, "APP_ENV", "test")
    assert persistence_module._resolve_sql_echo() is False


def test_resolve_sql_echo_uses_app_env_when_sql_echo_invalid(monkeypatch):
    monkeypatch.setattr(persistence_module.config, "SQL_ECHO", "not-a-bool")
    monkeypatch.setattr(persistence_module.config, "APP_ENV", "test")
    assert persistence_module._resolve_sql_echo() is True

    monkeypatch.setattr(persistence_module.config, "APP_ENV", "production")
    assert persistence_module._resolve_sql_echo() is False


def test_get_db_yields_session_and_closes_it(monkeypatch):
    class _FakeSession:
        def __init__(self):
            self.closed = False

        def close(self):
            self.closed = True

    fake_session = _FakeSession()
    monkeypatch.setattr(persistence_module, "SessionLocal", lambda: fake_session)

    generator = persistence_module.get_db()
    yielded = next(generator)
    assert yielded is fake_session

    with pytest.raises(StopIteration):
        next(generator)
    assert fake_session.closed is True
