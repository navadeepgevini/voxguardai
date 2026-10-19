---
name: amvtf-analyze
description: Debug or extend the VoxGuard AMVTF voice analysis pipeline (AASIST, ECAPA, NLP, fusion, spectrogram). Use when changing authenticity scoring, identity match, scam NLP, or /api/analyze endpoints.
---

# AMVTF Analyze Skill

## When to use

- Changing `backend/engines/*` or `backend/routers/analyze.py`
- Fixing LIVE vs upload scoring mismatch
- Aligning frontend `AudioAnalysisResponse` with backend

## Workflow

1. Read `backend/routers/analyze.py` for request path (`/audio` vs `/live`).
2. Trace engines in order: AASIST → ECAPA → NLP → AMVTF → spectrogram.
3. Check fusion weights in `engines/amvtf.py` against dashboard copy (40/35/25 with target).
4. Verify `echoguard/src/lib/api.ts` types still match.
5. Smoke: hit `/api/health`, then upload a short WAV via `/api/analyze/audio` or use Live Analysis UI.

## Checklist

- [ ] Authenticity, identity, contextRisk, fusedRiskScore present
- [ ] `actionType` is ALLOW | STEP_UP | TERMINATE
- [ ] Spectrogram `data_url` optional but metadata consistent
- [ ] No secrets in logs; temp audio cleaned up if written

## Do not

- Claim neural AASIST/ECAPA/DistilBERT unless those weights and loaders exist
- Break SQLite/Postgres dual path while debugging
