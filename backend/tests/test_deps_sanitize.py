"""Security regression: DATABASE_URL sanitizer must not embed credentials."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import sanitize_postgres_url, demo_users_allowed


def test_sanitize_does_not_inject_hardcoded_password():
    url = "postgresql://postgres:MySecret%40123@db.exampleproject.supabase.co:5432/postgres"
    out = sanitize_postgres_url(url)
    assert "Mahesh" not in out
    assert "MySecret" in out or "MySecret%40123" in out


def test_demo_users_blocked_in_production(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.delenv("ALLOW_DEMO_USERS", raising=False)
    assert demo_users_allowed() is False


def test_demo_users_allowed_when_flagged(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("ALLOW_DEMO_USERS", "true")
    assert demo_users_allowed() is True
