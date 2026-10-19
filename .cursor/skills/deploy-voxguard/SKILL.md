---
name: deploy-voxguard
description: Guide deploy and env setup for VoxGuard backend (Render) and EchoGuard frontend (Vercel). Use when configuring production, DATABASE_URL, CORS, or NEXT_PUBLIC_API_URL.
---

# Deploy VoxGuard

## Backend (Render)

- Root: `backend`
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Env: `DATABASE_URL`, `SECRET_KEY`, `ALLOWED_ORIGINS`, optional SMTP_*
- Blueprint: `render.yaml`

## Frontend (Vercel)

- Root: `echoguard`
- Env: `NEXT_PUBLIC_API_URL=<backend URL>`
- Optional: `RESEND_API_KEY`, `RESEND_FROM`, `BACKEND_INTERNAL_URL`, `NEXT_PUBLIC_APP_URL`

## Local dual-mode DB

- No `DATABASE_URL` → SQLite `backend/voxguard.db`
- With Postgres URL → `psycopg2` path in `database.py`

## Verify

1. `GET /api/health` returns AMVTF models block
2. Login + Live Analysis against production API
3. CORS allows the Vercel origin

## Never

- Commit real `.env` or connection strings with passwords
