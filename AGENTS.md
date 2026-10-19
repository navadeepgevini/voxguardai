# VoxGuard / EchoGuard AI — Agent Guide

This file orients Cursor (and other coding agents) working in this repository.

## Product

**VoxGuard / EchoGuard AI** is an enterprise voice security SOC platform (AMVTF v2.4).

It scores call audio for:

1. **Authenticity** — deepfake / synthetic voice (AASIST-style engine)
2. **Identity** — speaker match vs enrolled voiceprints (ECAPA-style embeddings)
3. **Context risk** — scam / social-engineering language (NLP keyword + ASR)

Fusion produces **SAFE | WARNING | CRITICAL** and **ALLOW | STEP_UP | TERMINATE**.

## Layout

| Path | Role |
|------|------|
| `backend/` | FastAPI SOC engine (analyze, auth, calls, identities, keys, notifications) |
| `backend/engines/` | AASIST, ECAPA, NLP, AMVTF fusion, spectrogram |
| `echoguard/` | Next.js 16 SOC dashboard |
| `echoguard/src/app/` | Pages: Live Analysis, Call History, Identities, Settings, Login |
| `echoguard/src/app/api/notifications/` | Resend-backed Next.js notification routes |
| `.cursor/` | Cursor rules, skills, and agent adapters (ECC / Agency / ADHD) |

## Stack

- **Backend:** Python 3.11+, FastAPI, Uvicorn, Pydantic v2, SQLite or PostgreSQL
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind 4
- **Deploy:** Render (`backend` / `render.yaml`), Vercel (`echoguard`)

## Local run

```bat
run_project.bat
```

- Dashboard: http://localhost:3000
- API docs: http://127.0.0.1:8000/docs
- API base env: `NEXT_PUBLIC_API_URL` (default `http://127.0.0.1:8000`)

## Hard rules for agents

1. Never commit `.env`, `voxguard.db`, secrets, or API keys.
2. Do not invent “full AASIST GNN / ECAPA-TDNN / DistilBERT” if the code uses heuristics, sklearn, or FFT embeddings — describe what the code actually does.
3. Prefer dual-DB compatibility (`?` placeholders; Postgres wrapper remaps).
4. Frontend notifications often use relative `/api/notifications/*` (Next), not always `API_BASE`.
5. Keep changes scoped; match existing patterns in `backend/routers/` and `echoguard/src/lib/api.ts`.

## Cursor tooling in this repo

| Source | Location | Purpose |
|--------|----------|---------|
| VoxGuard rules | `.cursor/rules/voxguard-*.mdc` | Product + stack conventions |
| Tooling agents rule | `.cursor/rules/tooling-agents.mdc` | Context7/DevTools/DB/Serena fallbacks |
| MCP template | `.cursor/mcp.json.example` | Optional Context7/Chrome/DBHub/Serena |
| i-have-adhd | `.cursor/skills/i-have-adhd/` | Action-first response style (`/i-have-adhd`) |
| ECC adapter | `.cursor/` (if installed) | Plan / TDD / review harness |
| Agency Agents | `.cursor/rules/agency-*.mdc` | Specialist personas |
| Awesome Agents | `.cursor/references/awesome-agents.md` | Catalog bookmarks for future product work |
| Antigravity agents | `.agents/` | Skills, subagents, CodeMem, MCP config |
| Tooling guide | `docs/development-tooling.md` | Setup / disable / availability |

### Specialized agents (dev-only)

See `.agents/AGENT_REGISTRY.md`: Documentation (Context7), Browser Debug, Database, Code Intel (Serena), shadcn/a11y, Knowledge Graph, UI Quality, CodeMem.

**App runtime does not depend on MCP.** If a tool is offline, use the documented fallback.

## Useful prompts

```text
@voxguard-core Explain the AMVTF fusion path for /api/analyze/audio
@agency-security-engineer Review backend/routers/auth.py
/i-have-adhd Fix the live mic analyze interval on the dashboard
```
