"""Lightweight middleware helpers: rate limit + request timing logs."""
from __future__ import annotations

import os
import threading
import time
from collections import defaultdict, deque
from typing import Callable, Deque, Dict, Optional, Tuple

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class InMemoryRateLimiter:
    """Per-IP sliding window. Single-process only (use Redis for multi-worker)."""

    def __init__(self, max_requests: int = 120, window_seconds: float = 60.0):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str) -> Tuple[bool, int]:
        now = time.time()
        with self._lock:
            q = self._hits[key]
            cutoff = now - self.window_seconds
            while q and q[0] < cutoff:
                q.popleft()
            if len(q) >= self.max_requests:
                return False, 0
            q.append(now)
            remaining = max(0, self.max_requests - len(q))
            return True, remaining


_limiter = InMemoryRateLimiter(
    max_requests=int(os.environ.get("RATE_LIMIT_PER_MINUTE", "120")),
    window_seconds=60.0,
)

# Stricter bucket for analyze endpoints
_analyze_limiter = InMemoryRateLimiter(
    max_requests=int(os.environ.get("ANALYZE_RATE_LIMIT_PER_MINUTE", "30")),
    window_seconds=60.0,
)


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.url.path in ("/api/health", "/docs", "/openapi.json", "/redoc"):
            return await call_next(request)
        if request.scope.get("type") == "websocket":
            return await call_next(request)

        client = request.client.host if request.client else "unknown"
        path = request.url.path
        ok, remaining = _limiter.allow(client)
        if path.startswith("/api/analyze"):
            ok2, rem2 = _analyze_limiter.allow(f"analyze:{client}")
            ok = ok and ok2
            remaining = min(remaining, rem2)

        if not ok:
            return Response(
                content='{"detail":"Rate limit exceeded. Retry shortly."}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": "60", "X-RateLimit-Remaining": "0"},
            )

        t0 = time.perf_counter()
        response = await call_next(request)
        ms = (time.perf_counter() - t0) * 1000.0
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-Process-Time-Ms"] = f"{ms:.1f}"
        return response
