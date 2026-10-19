"""Schema migration smoke tests."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_connection, init_db
from migrations import apply_pending_migrations, MIGRATIONS


def test_migrations_apply_idempotent():
    init_db()
    conn = get_connection()
    cur = conn.cursor()
    apply_pending_migrations(cur, conn, is_postgres=False)
    apply_pending_migrations(cur, conn, is_postgres=False)
    cur.execute("SELECT version, name FROM schema_migrations ORDER BY version")
    rows = cur.fetchall()
    versions = [int(r["version"] if hasattr(r, "keys") else r[0]) for r in rows]
    assert 1 in versions
    assert 2 in versions
    assert len(versions) >= len(MIGRATIONS)
    # Index existence (SQLite)
    cur.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_calls_verdict'")
    assert cur.fetchone() is not None
    conn.close()
