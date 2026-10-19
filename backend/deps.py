"""Shared FastAPI dependencies for VoxGuard authentication."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import Header, HTTPException, status

from database import get_connection


def _parse_bearer(authorization: Optional[str]) -> str:
    if not authorization or not authorization.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    parts = authorization.strip().split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return authorization.strip()


def _session_expired(expires_val) -> bool:
    try:
        if isinstance(expires_val, datetime):
            expires_dt = expires_val
        else:
            expires_str = str(expires_val).replace("Z", "")
            expires_dt = datetime.fromisoformat(expires_str)
        now_dt = datetime.utcnow()
        if expires_dt.tzinfo is not None:
            expires_dt = expires_dt.replace(tzinfo=None)
        return now_dt > expires_dt
    except Exception:
        # Fail closed: unparseable expiry is treated as expired
        return True


def require_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """
    Require a valid, non-expired session. Returns user dict:
    {id, username, email, full_name, role, created_at, token}
    """
    token = _parse_bearer(authorization)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT s.token, s.expires_at, u.id, u.username, u.email, u.full_name, u.role, u.created_at
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ?
            """,
            (token,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session token",
            )
        if _session_expired(row["expires_at"]):
            cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
            conn.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has expired. Please log in again.",
            )
        return {
            "id": row["id"],
            "username": row["username"],
            "email": row["email"],
            "full_name": row["full_name"],
            "role": row["role"],
            "created_at": str(row["created_at"]) if row["created_at"] is not None else None,
            "token": token,
        }
    finally:
        conn.close()


def optional_current_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """Return user dict if Bearer session is valid; otherwise None."""
    if not authorization:
        return None
    try:
        return require_current_user(authorization)
    except HTTPException:
        return None
