"""
Versioned schema migrations for SQLite and PostgreSQL.

Applied automatically from init_db via apply_pending_migrations().
Keep migrations idempotent where possible.
"""
from __future__ import annotations

from typing import Any, Callable, List, Tuple


MigrationFn = Callable[[Any, Any, bool], None]  # cursor, conn, is_postgres


def _ensure_schema_table(cursor, is_postgres: bool) -> None:
    if is_postgres:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
    else:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )


def _applied_versions(cursor) -> set:
    try:
        cursor.execute("SELECT version FROM schema_migrations")
        rows = cursor.fetchall()
        out = set()
        for r in rows:
            if isinstance(r, dict) or hasattr(r, "keys"):
                out.add(int(r["version"]))
            else:
                out.add(int(r[0]))
        return out
    except Exception:
        return set()


def m001_indexes(cursor, conn, is_postgres: bool) -> None:
    statements = [
        "CREATE INDEX IF NOT EXISTS idx_calls_verdict ON calls(verdict)",
        "CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at)",
        "CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)",
        "CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status)",
        "CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status)",
        "CREATE INDEX IF NOT EXISTS idx_voice_profiles_status ON voice_profiles(status)",
        "CREATE INDEX IF NOT EXISTS idx_notification_jobs_status ON notification_jobs(status)",
        "CREATE INDEX IF NOT EXISTS idx_notification_jobs_created ON notification_jobs(created_at)",
    ]
    for sql in statements:
        try:
            cursor.execute(sql)
        except Exception as e:
            print(f"[migrations] index warn: {e}")


def m002_voiceprint_protection_note(cursor, conn, is_postgres: bool) -> None:
    """
    Document retention: embeddings are operational biometrics.
    Adds optional revoked_at column for soft-delete / revocation audit.
    """
    if is_postgres:
        try:
            cursor.execute(
                "ALTER TABLE voice_profiles ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP"
            )
        except Exception:
            # Older Postgres without IF NOT EXISTS on ADD COLUMN
            try:
                cursor.execute("ALTER TABLE voice_profiles ADD COLUMN revoked_at TIMESTAMP")
            except Exception:
                pass
    else:
        cursor.execute("PRAGMA table_info(voice_profiles)")
        cols = {row[1] for row in cursor.fetchall()}
        if "revoked_at" not in cols:
            try:
                cursor.execute("ALTER TABLE voice_profiles ADD COLUMN revoked_at TEXT")
            except Exception:
                pass


MIGRATIONS: List[Tuple[int, str, MigrationFn]] = [
    (1, "add_core_indexes", m001_indexes),
    (2, "voice_profiles_revoked_at", m002_voiceprint_protection_note),
]


def apply_pending_migrations(cursor, conn, is_postgres: bool) -> List[str]:
    _ensure_schema_table(cursor, is_postgres)
    applied = _applied_versions(cursor)
    done: List[str] = []
    for version, name, fn in MIGRATIONS:
        if version in applied:
            continue
        fn(cursor, conn, is_postgres)
        cursor.execute(
            "INSERT INTO schema_migrations (version, name) VALUES (?, ?)",
            (version, name),
        )
        done.append(f"{version}:{name}")
    try:
        conn.commit()
    except Exception:
        pass
    if done:
        print(f"[migrations] applied: {', '.join(done)}")
    return done
