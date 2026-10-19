# Architecture Decision Records

## ADR-001 — Cursor agents as IDE overlay, not runtime

**Decision:** Keep ECC / Agency / ADHD / awesome-agents under `.cursor/` only.  
**Reason:** They improve development velocity; they are not part of the SOC product runtime.  
**Status:** Accepted.

## ADR-002 — Prefer auth gates before model upgrades

**Decision:** P0 focuses on credential removal, CORS, route auth, and honest health before replacing AASIST/ECAPA with neural models.  
**Reason:** Shipping neural models on an open API increases abuse/DoS risk.  
**Status:** Accepted.

## ADR-003 — Demo payments must be explicit

**Decision:** Paid plan activation via client UTR requires `ALLOW_DEMO_PAYMENTS=true`. Default refuse.  
**Reason:** Prevent accidental production fraud of billing.  
**Status:** Accepted (implementation in P0).

## ADR-004 — Soft operator auth is demo-only

**Decision:** Default operator fallback only when `NEXT_PUBLIC_ALLOW_DEMO_AUTH=true`.  
**Reason:** Production SOC must not be anonymously accessible.  
**Status:** Accepted (implementation in P0).

## ADR-005 — Do not rename engines yet

**Decision:** Keep AASIST/ECAPA module names; correct health/docs labels.  
**Reason:** Minimize frontend/API churn; honesty via documentation and health payload.  
**Status:** Accepted.
