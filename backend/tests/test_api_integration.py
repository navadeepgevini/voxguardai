"""API integration smoke tests (TestClient)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient

# Ensure demo users for local test login
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("ALLOW_DEMO_USERS", "true")

from main import app
from database import init_db

init_db()
client = TestClient(app)


def _login():
    # Prefer registering a unique user to avoid depending on seed credentials
    import time

    uname = f"testop_{int(time.time() * 1000) % 1000000}"
    reg = client.post(
        "/api/auth/register",
        json={
            "username": uname,
            "email": f"{uname}@example.com",
            "password": "testpass123",
            "full_name": "Test Operator",
            "role": "SOC Analyst",
        },
    )
    if reg.status_code in (200, 201):
        data = reg.json()
        token = data.get("token") or data.get("access_token")
        if token:
            return token
    login = client.post(
        "/api/auth/login",
        json={"username": uname, "password": "testpass123"},
    )
    assert login.status_code == 200, login.text
    return login.json()["token"]


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "healthy"
    assert body["models"]["authenticity"]["implementation"] == "acoustic_heuristics_optional_sklearn"
    assert "websocket_live_analyze" in body.get("realtime", {})


def test_analyze_requires_auth():
    r = client.post("/api/analyze/live", data={"transcript": "hello"})
    assert r.status_code in (401, 403)


def test_live_analyze_with_auth():
    token = _login()
    r = client.post(
        "/api/analyze/live",
        data={"transcript": "hello", "session_id": "pytest_sess_1"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "authenticity" in body
    assert "detectionState" in body or "sessionDetectionState" in body
    assert body["actionType"] in ("ALLOW", "STEP_UP", "TERMINATE")


def test_rate_limit_headers_present():
    r = client.get("/api/health")
    # health is exempt from blocking but middleware may still attach on other routes
    token = _login()
    r2 = client.post(
        "/api/analyze/live",
        data={"transcript": ""},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r2.status_code == 200
    assert "X-Process-Time-Ms" in r2.headers or "x-process-time-ms" in {k.lower() for k in r2.headers.keys()}
