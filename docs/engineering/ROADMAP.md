# VoxGuard Engineering Roadmap

Prioritized for safe, reversible local improvements. Production deploy requires explicit approval.

## P0 — Critical foundation (in progress)

| # | Item | Acceptance |
|---|------|------------|
| P0.1 | Baseline audit docs | `docs/engineering/*` present |
| P0.2 | Remove hardcoded DB credentials | No passwords in source; env-only |
| P0.3 | CORS from `ALLOWED_ORIGINS` | No `*`+credentials in production mode |
| P0.4 | Shared auth dependency | Sensitive routes require Bearer session |
| P0.5 | Protect user list / key leak / wipe endpoints | 401 without auth |
| P0.6 | Hard frontend auth (no default operator in prod) | Unauthenticated → `/login` |
| P0.7 | Seed users gated by `ENVIRONMENT` / `ALLOW_DEMO_USERS` | Off in production |
| P0.8 | Honest `/api/health` model labels | Match code reality |
| P0.9 | Payment verify demo gate | Refuse paid SUCCESS unless `ALLOW_DEMO_PAYMENTS=true` |
| P0.10 | Baseline pytest for AMVTF fusion | Boundary tests pass |
| P0.11 | Upload size limits | Reject oversized audio |

## P1 — Core product

- Wire settings thresholds into engines  
- Real streaming path or document HTTP-live as the supported model  
- Enroll-without-audio must not fake confidence  
- NLP negation / calibration improvements  
- Notification schema fix (`resend_message_id`)  
- Frontend Authorization header on SOC APIs  
- Init git + CI workflow (lint/test)  

## P2 — Production readiness

- Optional real speaker / anti-spoof models (licensed, evaluated)  
- Playwright E2E critical paths  
- Observability (structured logs, request IDs)  
- Rate limiting  
- Migration tooling  
- Independent security review  

## Explicit non-goals (without approval)

- Production deploy / push / merge  
- Real money movement  
- Mass model downloads  
- Destructive DB wipes on shared data  
