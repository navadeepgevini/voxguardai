# Benchmark Plan

## Shared metrics (CPU or GPU)

```bat
python scripts\eval_authenticity_baseline.py --eval-dir data\eval
```

Python API: `ml.metrics.full_report(y_true, scores)` → precision, recall, FPR, FNR, F1, AUROC, EER, TPR@1%FPR, ECE.

## Required breakdowns

- Overall
- Per generator (`ai_chatgpt`, `ai_gemini`, …)
- Seen vs unseen generator
- Clean vs codec-degraded
- Duration buckets (<2s, 2–6s, >6s)

## Latency

Record p50/p95 for:

- sklearn CPU (Laptop 1 baseline already ~10–50 ms / chunk on smoke tones)
- AASIST-L GPU
- AASIST-L CPU (for fallback)

## Target (aspirational)

≥95% recall @ ≤1% FPR on representative held-out live-call audio — report actuals; do not claim if unmet.
