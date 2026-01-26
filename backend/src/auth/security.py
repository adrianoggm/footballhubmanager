import base64
import hashlib
import os
import secrets


_ITERATIONS = 260000
_ALGO = "sha256"


def _b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def _b64decode(raw: str) -> bytes:
    padding = "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode(raw + padding)


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac(_ALGO, password.encode("utf-8"), salt, _ITERATIONS)
    return f"pbkdf2${_ALGO}${_ITERATIONS}${_b64encode(salt)}${_b64encode(dk)}"


def verify_password(plain: str, stored: str) -> bool:
    if stored.startswith("pbkdf2$"):
        try:
            _, algo, iterations, salt_b64, hash_b64 = stored.split("$", 4)
            salt = _b64decode(salt_b64)
            expected = _b64decode(hash_b64)
            dk = hashlib.pbkdf2_hmac(algo, plain.encode("utf-8"), salt, int(iterations))
            return secrets.compare_digest(dk, expected)
        except Exception:
            return False
    return secrets.compare_digest(plain, stored)
