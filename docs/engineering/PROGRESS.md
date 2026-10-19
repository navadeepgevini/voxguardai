# Engineering Progress

## Milestone: Phase 1 audit + P0 security foundation (2026-10-17)

### Completed

1. Confirmed workspace root `C:\voxguardai` — **not a git repository**.
2. Inventoried Cursor tooling under `.cursor/` (ECC rules, Agency personas, ADHD skill, VoxGuard rules). Upstream repos are IDE references, not app runtime.
3. Produced `BASELINE_AUDIT.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `RISKS.md`, `DECISIONS.md`.
4. Implemented reversible P0 security hardening (see Files changed).

### Files changed

| Path | Change |
|------|--------|
| `docs/engineering/*` | Audit / architecture / roadmap / risks / decisions / progress |
| `backend/deps.py` | Shared `require_current_user` (fail-closed expiry) |
| `backend/database.py` | Removed hardcoded Supabase password; gated demo seeds |
| `backend/main.py` | CORS from `ALLOWED_ORIGINS`; honest health; WS auth |
| `backend/routers/*.py` | Auth on SOC/analyze/settings/calls/identities/notifications/keys |
| `backend/routers/keys.py` | Block UTR verify & free topup unless `ALLOW_DEMO_PAYMENTS` |
| `echoguard/src/lib/auth-context.tsx` | No default operator unless `NEXT_PUBLIC_ALLOW_DEMO_AUTH` |
| `echoguard/src/components/app-shell.tsx` | Redirect unauthenticated → `/login` |
| `echoguard/src/lib/api.ts` | Bearer `authHeaders()` on protected SOC calls |
| `backend/tests/test_amvtf.py` | Fusion boundary unit tests |
| `backend/tests/test_deps_sanitize.py` | Credential sanitize + demo seed gates |
| `backend/.env.example` | Documented security flags |
| `echoguard/.env.example` | Frontend env template |
| `.cursor/agents/principal-architect.md` | Project architect agent |
| `.cursor/commands/audit-status.md` | Status command |

### Verification

Commands executed / to execute (record results below after run):

```powershell
cd C:\voxguardai\backend
python -m pytest tests/ -q
python -c "from database import sanitize_postgres_url; print('Mahesh' not in sanitize_postgres_url('postgresql://u:p@db.x.supabase.co/db'))"
```

| Check | Result |
|-------|--------|
| Pytest AMVTF + sanitize | **9 passed** (`python -m pytest tests/ -q`) |
| Backend import / health | **OK** after `pip install -r requirements.txt` — health reports `acoustic_heuristics_optional_sklearn`; WS `simulated_demo` |
| Frontend build | Not run yet this milestone |

### Issues found (remaining)

- No git remote / history.
- No CI/CD, Docker, Playwright.
- Engines still heuristic (honest health now).
- Payment still demo-gated, not PSP-integrated.
- Next.js notification routes still need session linking to FastAPI auth for full end-to-end.
- `SECRET_KEY` still unused (sessions are opaque DB tokens).
- Existing local DB may still contain previously seeded demo users — rotate/delete manually if needed.
- **Rotate any previously exposed Supabase password immediately** (was in source history on this machine).

### Remaining (highest priority next)

1. Run pytest + health smoke; fix any failures.
2. Ensure local demo flow: set `ALLOW_DEMO_USERS=true` + create/login user OR enable demo flags intentionally.
3. Wire Next notification trigger auth to backend session.
4. Continue P1: threshold wiring, streaming honesty, enroll-without-audio fake confidence.

### Next action

Execute baseline pytest and record results; then proceed P1 enroll confidence fix + settings→engine threshold wiring.
