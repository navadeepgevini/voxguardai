# AI Detection Workstream Progress

**Date:** 2026-10-18

## Milestone summary

| Milestone | Status |
|-----------|--------|
| Engine audit | Done → `EXISTING_MODEL_AUDIT.md` |
| Accuracy plan + supporting docs | Done → `docs/ai/*` |
| Fix ML wipe / silence false SAFE | Done |
| Detection states + calibration load | Done |
| Session EMA aggregator | Done |
| AMVTF semantic separation | Done |
| Live UI panel + session_id | Done |
| Baseline eval harness | Done → `scripts/eval_authenticity_baseline.py` |
| Unit tests (scoring / session / AMVTF gates) | Done → `backend/tests/test_*.py` |
| Licensed ChatGPT/Gemini eval metrics | Blocked on authorized data |
| Real AASIST / WavLM integration | Deferred until measured gain on held-out set |

## Highest-impact change shipped

Stop clearing ML synthetic evidence when bio “human” gates pass; silence no longer scores ~92 SAFE; session-level EMA requires ~3 s voiced audio before trusting live SOC fusion.

## Honest performance statement

**≥95% recall @ ≤1% FPR on representative held-out live-call audio is not evidenced.** Config CV accuracy (93.1%) is not that metric. Place authorized WAVs under `data/eval/` and re-run the baseline harness.

## Next priority

1. Collect authorized conversational TTS + human VoIP samples into `data/eval/`.
2. Run harness; report TPR@1%FPR / EER if sample size supports it.
3. Only then evaluate official AASIST-L (clovaai) on the same set vs current sklearn.
