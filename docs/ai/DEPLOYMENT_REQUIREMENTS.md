# Deployment Requirements — Authenticity Models

## Current stack

| Layer | Host | Model implication |
|-------|------|-------------------|
| FastAPI | Render | sklearn joblib + numpy/scipy on CPU |
| Next.js | Vercel | No model weights; calls `NEXT_PUBLIC_API_URL` |
| DB | SQLite local / Postgres via `DATABASE_URL` | Call history only |

## Environment variables (auth / API — not model secrets)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend base URL |
| `DATABASE_URL` | Postgres when set |
| `CORS_ORIGINS` / auth secrets | Per existing deploy skill |

**Do not** put biometric enrollments or private audio in env vars.

## CPU-first (recommended now)

- Keep `trained_live_classifier.joblib` loaded once at process start (already)
- Single Uvicorn worker if relying on in-memory `LiveSessionAggregator`
- Or move session state to Redis for multi-worker

## GPU / neural path (future)

| Need | When |
|------|------|
| ≥4–8 GB RAM | WavLM-base or AASIST + overhead |
| CUDA worker | Prefer dedicated inference service; do not assume free Render GPU |
| Queue | Optional for upload batch; live path needs sync p95 budget |

## Do not

- Expect free-tier instances to host multi-hundred-MB SSL models at SOC latency
- Auto-TERMINATE production calls on `UNCERTAIN` alone (already gated in AMVTF)
