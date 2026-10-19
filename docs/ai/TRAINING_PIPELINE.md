# Training Pipeline

## Current shipped classifier

- Artifact: `backend/engines/trained_live_classifier.joblib`
- Config: `backend/engines/trained_model_config.json`
- Features: 12 handcrafted (jitter, pitch_cv, pitch_range, voiced_hi_ratio, stft_hi_ratio, env_diff_kurt, low_freq_ratio, pause_*, spectral_entropy, zcr)
- Head: SoftVoting ensemble (RandomForest + ExtraTrees + HistGradientBoosting)
- Thresholds: `backend/engines/calibrated_thresholds.json` (bio gates; now loaded at runtime)

Training scripts that produced the joblib are **not** in this monorepo snapshot. Re-training requires rebuilding the feature extractor to match `feature_names` order exactly.

## Recommended retrain loop (when licensed data is available)

```text
1. Build manifest (DATASET_STRATEGY.md)
2. Extract 12-D features per 1.5–2.0 s voiced window @ 16 kHz
3. Train SoftVoting (or replace with neural) on train split only
4. Calibrate probabilities on validation (isotonic / Platt)
5. Tune decision threshold for target FPR on validation
6. Freeze test set evaluation → ACCURACY_BENCHMARK.md
7. Export joblib + config + thresholds + checksums
```

## Commands (baseline eval — no retrain)

```bat
cd C:\voxguardai
python scripts\eval_authenticity_baseline.py
python scripts\eval_authenticity_baseline.py --eval-dir data\eval
```

## Do not

- Tune thresholds on the final test set
- Mix ChatGPT/Gemini eval files into training until a later disjoint holdout is defined
- Commit raw biometric enrollments or private call audio
