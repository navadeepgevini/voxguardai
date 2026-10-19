---
title: VoxGuard AI — Deployment & Runbook Guide
project: B.Tech Major Project — Deepfake Audio Authentication Guard
version: 1.0.0
tags:
  - deployment
  - runbook
  - docker
  - render
  - vercel
---

# VoxGuard AI — Deployment & Runbook Guide

## 1. Local Development Quickstart

### Prerequisites
- **Node.js**: v18.0 or newer (v24.15 tested)
- **Python**: 3.10 to 3.13 (Python 3.13 tested)
- **Git**: For version control

### Launching the Stack (Windows One-Click)
Double-click `run_project.bat` in the project root to launch both the FastAPI backend and Next.js frontend concurrently.

Alternatively, run in separate terminal windows:

#### Terminal 1 — FastAPI Backend (`:8000`)
```bash
cd "backend"
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
- Endpoint: `http://127.0.0.1:8000`
- Swagger UI: `http://127.0.0.1:8000/docs`

#### Terminal 2 — Next.js Frontend (`:3000`)
```bash
cd "echoguard"
npm install
npm run dev
```
- Dashboard: `http://localhost:3000`

---

## 2. Environment Variables Setup

Copy `.env.example` to `.env` (backend) and `.env.local` (frontend):

| Variable Name | Scope | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Backend | `sqlite:///backend/voxguard.db` | PostgreSQL or local SQLite DSN |
| `SECRET_KEY` | Backend | Random 64-char hex string | Session & JWT signing key |
| `ALLOWED_ORIGINS` | Backend | `http://localhost:3000` | Allowed CORS origins for browser fetch |
| `NEXT_PUBLIC_API_URL` | Frontend | `http://127.0.0.1:8000` | Backend base URL for Next.js API proxy |
| `RESEND_API_KEY` | Backend/API | `re_placeholder...` | Optional Resend API key (uses Demo Relay if unset) |
| `ALERT_FROM_EMAIL` | Backend/API | `onboarding@resend.dev` | Verified sender email domain |
| `ALERT_TO_EMAIL` | Backend/API | `security-team@example.com` | Target recipient for priority incident alerts |

---

## 3. Production Deployment Architectures

### A. Next.js Frontend on Vercel
1. Import repository on [vercel.com](https://vercel.com).
2. Set Root Directory to `echoguard`.
3. Configure Environment Variable:
   - `NEXT_PUBLIC_API_URL`: URL of your deployed backend service (e.g. `https://voxguard-backend.onrender.com`).
4. Deploy: Automatically builds using Turbopack with zero configuration.

### B. FastAPI Backend on Render / Railway
1. Create a **New Web Service** pointing to this repository.
2. Build Command: `pip install -r backend/requirements.txt`
3. Start Command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Set Environment Variables (`DATABASE_URL`, `SECRET_KEY`, `ALLOWED_ORIGINS`).

### C. Docker Multi-Container Compose
```yaml
version: '3.8'
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=sqlite:///voxguard.db
      - ALLOWED_ORIGINS=http://localhost:3000
    volumes:
      - voxguard_data:/app/data

  frontend:
    build:
      context: ./echoguard
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000

volumes:
  voxguard_data:
```

---

## 4. Health Checks & Troubleshooting

| Symptom | Diagnostic Check | Resolution |
| :--- | :--- | :--- |
| **Backend connection refused** | `curl.exe -I http://127.0.0.1:8000/docs` | Start backend with `run_backend.bat` |
| **Preview spectrogram empty** | Check browser console (F12) | Confirm file is valid `.wav`, `.mp3`, or `.flac` |
| **Resend email not delivered** | Check backend terminal logs | If using free key, ensure recipient matches verified account or verify custom domain |
