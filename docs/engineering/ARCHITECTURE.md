# VoxGuard / EchoGuard — Architecture

## System context

```
Browser (EchoGuard Next.js)
  ├─ REST → FastAPI (NEXT_PUBLIC_API_URL)
  ├─ Live mic → PCM WAV chunks → POST /api/analyze/live (poll ~1.8s)
  └─ Relative /api/notifications/* → Next.js (Resend) → optional FastAPI audit
         │
         ▼
FastAPI (backend/)
  ├─ Auth sessions (opaque tokens in DB)
  ├─ Analyze: AASIST → ECAPA → NLP → AMVTF → Spectrogram
  ├─ Calls / Identities / Settings / Keys / Notifications
  ├─ WS /ws/audio-stream (currently simulated)
  └─ DB: SQLite local | PostgreSQL when DATABASE_URL set
```

## Backend modules

| Module | Responsibility |
|--------|----------------|
| `main.py` | App, CORS, health, WebSocket |
| `database.py` | Dual DB, schema init, password hashing, seeds |
| `models.py` | Pydantic schemas |
| `routers/*` | HTTP API surface |
| `engines/*` | Detection + fusion + spectrogram |
| `services/notifications.py` | SMTP / demo alert dispatch |

## Frontend modules

| Path | Responsibility |
|------|----------------|
| `src/app/page.tsx` | Live Analysis SOC console |
| `src/app/call-history` | Audit trail |
| `src/app/identities` | Voiceprint registry |
| `src/app/settings` | Thresholds, alerts, billing |
| `src/app/login` | Auth UI |
| `src/lib/api.ts` | FastAPI + notification clients |
| `src/lib/auth-context.tsx` | Session state |
| `src/app/api/notifications/*` | Resend server routes |

## AMVTF data flow

1. Decode audio → mono 16 kHz  
2. Authenticity score (AASIST engine)  
3. Identity score vs optional enrolled profile (ECAPA engine)  
4. Transcript + context risk (NLP engine)  
5. Fuse → verdict + actionType  
6. Optional spectrogram evidence  
7. Optional persist to `calls` + notification trigger  

## Auth model (current)

- Backend: Bearer opaque session token in `sessions` table  
- Frontend: `localStorage` key `voxguard_auth_token`  
- Gap: most APIs do not require auth; frontend soft-defaults to operator  

## Deployment topology

| Service | Host | Root |
|---------|------|------|
| API | Render | `backend/` |
| UI | Vercel | `echoguard/` |
| DB | Neon/Supabase/Render Postgres | `DATABASE_URL` |

## Cursor engineering overlay

Project uses `.cursor/rules` + `.cursor/skills` for IDE agents (ECC, Agency, ADHD, VoxGuard). This overlay does **not** run inside the production application.
