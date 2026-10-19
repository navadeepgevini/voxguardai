# Accuracy Improvement Plan — VoxGuard Authenticity

**Status:** Active (Phase 1–5 scaffolding landed; neural upgrade pending measured eval)  
**Date:** 2026-10-18  
**Baseline:** See `EXISTING_MODEL_AUDIT.md` — heuristics + optional sklearn SoftVoting joblib (not Jung AASIST GNN)

## Priority order

1. **Detection accuracy** on held-out conversational TTS (ChatGPT Voice, Gemini Live, ElevenLabs)
2. **Generalization** to unseen generators
3. **Low FPR** on genuine human speech (≤1% aspirational)
4. **Real-time reliability** (~3–6 s voiced audio to first useful session verdict)
5. Security / performance / deploy

## Milestone map

| ID | Change | Status | Evidence |
|----|--------|--------|----------|
| M0 | Audit engines + live path | Done | `EXISTING_MODEL_AUDIT.md` |
| M1 | Stop wiping ML on bio gates; silence → INSUFFICIENT/WAITING | Done | `aasist.py` |
| M2 | Load `calibrated_thresholds.json`; detection states + syntheticProbability | Done | `aasist.py` |
| M3 | Session EMA aggregator (~3 s voiced) | Done | `live_session.py` + analyze live |
| M4 | AMVTF: acoustic ≠ fraud NLP; no TERMINATE on silence/uncertain alone | Done | `amvtf.py` |
| M5 | Live UI: Live AI Voice Detection panel + `session_id` | Done | `page.tsx`, `api.ts` |
| M6 | Upload path also runs joblib features | Done | `analyze_audio` |
| M7 | Reproducible baseline harness (synthetic fixtures) | In progress | `scripts/eval_authenticity_baseline.py` |
| M8 | Licensed ASVspoof / MLAAD / authorized ChatGPT·Gemini samples | Blocked on data | `DATASET_STRATEGY.md` |
| M9 | Real AASIST / SSL encoder eval (CPU-first) | Not started | `MODEL_COMPARISON.md` |
| M10 | Calibrated ensemble only if Val ΔTPR@1%FPR justifies | Not started | — |

## Why conversational AI was misclassified

1. Bio “human” gates cleared **all** threat including ML (`threat_penalty = 0`).
2. Silence scored ~92 SAFE.
3. No temporal aggregation → one-frame flips.
4. Upload never used the trained classifier.
5. No held-out conversational-TTS eval in CI.

## Immediate next experiments (no unverified downloads)

1. Run `python scripts/eval_authenticity_baseline.py` after placing licensed WAVs under `data/eval/` (see dataset strategy).
2. Profile live chunk latency (p50/p95) on target CPU.
3. Only then consider cloning official AASIST weights with license review.

## Success criteria (verified, not assumed)

- Report TPR @ 1% FPR, EER, AUROC on **held-out** sets.
- Aspirational: ≥95% recall @ ≤1% FPR on representative live-call audio — **not currently evidenced**.
- First session verdict after ~3–6 s voiced audio when signal quality allows.
- Never fabricate ChatGPT/Gemini metrics without authorized samples.
