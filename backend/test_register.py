import urllib.request
import json
import urllib.error
import uuid

# generate a unique username so we don't conflict with existing ones
unique_user = f"testuser_{uuid.uuid4().hex[:6]}"

url = "http://127.0.0.1:8000/api/v1/auth/register"
payload = {
    "username": unique_user,
    "password": "securepassword123", # 17 characters (>= 12)
    "name": "Test",
    "surname1": "Player",
    "surname2": "One",
    "nationality": "Spain"
}

req = urllib.request.Request(
    url,
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    with urllib.request.urlopen(req) as res:
        print("Status:", res.status)
        print("Body:", res.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    print("HTTP Error Status:", e.code)
    print("HTTP Error Body:", e.read().decode("utf-8"))
except Exception as e:
    print("Error:", e)
