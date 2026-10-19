---
title: API Routes Reference
tags:
  - api
  - fastapi
  - nextjs
---

# API Routes Reference

## 1. FastAPI Backend Routes (`http://127.0.0.1:8000`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/analyze` | Ingest audio file, compute spectrogram & return deepfake verdict |
| `GET` | `/api/calls` | Retrieve recent call history records |
| `GET` | `/api/calls/{call_id}` | Retrieve individual call record with forensic spectrogram & metadata |
| `POST` | `/api/identities` | Enroll caller identity voiceprint hash |
| `GET` | `/api/identities` | List enrolled biometric identities |
| `WS` | `/ws/stream` | WebSocket channel for real-time live mic streaming analysis |

## 2. Next.js App Router API Routes (`http://localhost:3000`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/notifications/trigger` | Dispatch emergency incident alert via Resend |
| `GET` | `/api/notifications/recipients` | List verified alert email recipients |
| `POST` | `/api/notifications/test-email` | Send test verification email to confirm delivery |
| `GET` | `/api/notifications/settings` | Read current notification threshold settings |

## Related Documents
- [[../architecture/system-overview|System Architecture]]
- [[../architecture/audio-analysis-pipeline|Audio Pipeline]]
