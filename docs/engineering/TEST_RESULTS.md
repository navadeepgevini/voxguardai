# Test Results

## Latest run — 2026-10-20

```bat
cd C:\voxguardai\backend
python -m pytest tests -q --tb=line
```

```text
52 passed, 7 warnings in 8.09s
```

Aligned `test_antispoof_research` / `test_threshold_responsiveness` to live `detectionState` APIs. Empty upload path now returns `INSUFFICIENT_AUDIO` consistently.

## Prior run — 2026-10-18

```text
40 passed, 7 warnings in 5.98s
```

Coverage areas: AMVTF, live session, AASIST scoring, deps sanitize, audio preprocess, metrics/detector, migrations, API integration (health/auth/live), NLP Indic keywords.

## Commands (full)

```bat
cd C:\voxguardai\backend
python -m pytest tests -q --tb=short

cd C:\voxguardai
python scripts\eval_authenticity_baseline.py
python scripts\detect_hardware.py
python -m ml.train_entrypoint --config ml\configs\train_gpu_rtx3060.yaml --dry-run
```

## Frontend build

**BLOCKED:** `echoguard/node_modules` missing. Run `npm install` then `npm run build` in `echoguard/`.
