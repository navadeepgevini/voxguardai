# Accuracy Benchmark

**Last updated:** 2026-10-18  
**Rule:** Only measured numbers. No invented ChatGPT/Gemini scores.

## Aspirational targets (not achieved / not evidenced)

| Target | Status |
|--------|--------|
| ≥95% synthetic recall @ ≤1% FPR on held-out live-call audio | **Not measured** — no licensed conversational eval set in repo |
| First useful live decision in ~3–6 s voiced | **Implemented** as session gate; accuracy of that decision still unevaluated on real TTS |

## Config-claimed training CV (not held-out live)

From `trained_model_config.json`:

| Metric | Value | Caveat |
|--------|-------|--------|
| CV mean accuracy | 93.1% | Training distribution; class balance skewed (~43k human / ~96k AI) |
| CV std | 0.22% | Same |

**These are not TPR@1%FPR, not EER, and not ChatGPT/Gemini Live results.**

## Local baseline harness

```bat
python scripts\eval_authenticity_baseline.py
```

### Synthetic smoke fixtures (generated in-process)

Used only to verify pipeline health (silence / short / tone). **Not** a deepfake accuracy claim.

Results are written to `docs/ai/baseline_last_run.json` when the script runs.

**Measured 2026-10-18** (`sklearn-softvote-cv93.1-n139064`, joblib loaded):

| Fixture | detectionState | authenticity | latency_ms |
|---------|----------------|--------------|------------|
| silence 1.8 s | WAITING_FOR_SPEECH | 50.0 | ~11 |
| short 0.15 s tone | LIKELY_AI_GENERATED | 48.0 | ~48 |
| 180 Hz tone 1.8 s | LIKELY_AI_GENERATED | 48.0 | ~38 |
| session after silence×3 | WAITING_FOR_SPEECH, voiced=0 s | — | — |

Labeled eval files: **0** (no ChatGPT/Gemini/human WAVs in `data/eval`).

### Licensed `data/eval` (optional)

When WAVs exist under `data/eval/{human,ai_*}/`, the harness reports:

- Precision, recall, FPR, FNR, F1
- Confusion matrix
- Latency p50/p95
- Per-generator breakdown when folder names encode generator

Until that data exists, **AUROC / EER / TPR@1%FPR remain unreported**.

## ChatGPT Voice / Gemini Live

**No authorized evaluation samples in repository → no subset metrics.**

## Public literature reference (not our system)

Official AASIST on ASVspoof 2019 LA reports ~0.83% EER (in-domain). Cross-domain InTheWild EER for the same checkpoint family is much higher (~40%+ in third-party arena tables). This illustrates domain shift — do not assume ASVspoof EER transfers to ChatGPT Voice.
