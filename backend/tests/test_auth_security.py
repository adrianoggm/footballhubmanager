from auth.security import hash_password, verify_password


def test_verify_password_positive_matching_pbkdf2_hash():
    stored = hash_password("secret123")

    assert verify_password("secret123", stored)


def test_verify_password_negative_wrong_password():
    stored = hash_password("secret123")

    assert not verify_password("different-password", stored)


def test_verify_password_rejects_plaintext_stored_password():
    assert not verify_password("secret123", "secret123")


def test_verify_password_rejects_malformed_pbkdf2_hash():
    assert not verify_password("secret123", "pbkdf2$sha256$260000$missing_hash")
