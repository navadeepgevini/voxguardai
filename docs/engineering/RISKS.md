# Risk Register

| ID | Severity | Status | Description | Mitigation |
|----|----------|--------|-------------|------------|
| C1 | Critical | Mitigated | Hardcoded Supabase credentials in `database.py` | Removed from source; **rotate password externally** |
| C2 | Critical | Mitigated | UTR verify issues paid keys without PSP | Gated by `ALLOW_DEMO_PAYMENTS` (default off) |
| C3 | Critical | Mitigated | Unauthenticated active API key return | Requires auth; no global key fallback |
| C4 | High | Mitigated | Demo seed passwords always seeded | Gated by `ALLOW_DEMO_USERS` / non-prod |
| H1 | High | Mitigated | CORS `*` + credentials | Uses `ALLOWED_ORIGINS` |
| H2 | High | Mitigated | Soft default operator | `NEXT_PUBLIC_ALLOW_DEMO_AUTH` only |
| H3 | High | Mitigated | Open wipe / settings / analyze | `require_current_user` on SOC routes |
| H4 | Medium | Open | No rate limits on login/analyze | Add limiter (P1) |
| H5 | Medium | Open | WS simulated + unauthenticated | Auth + real stream or document-as-demo |
| M1 | Medium | Open | Engine marketing vs reality | Honest health + docs |
| M2 | Medium | Open | No automated tests | Add pytest/Playwright |
| M3 | Medium | Open | notification_jobs column mismatch | Migration |
| M4 | Low | Open | No git repo at workspace root | `git init` when approved |
| M5 | Low | Open | Free-tier may not host ML | Document compute needs |
