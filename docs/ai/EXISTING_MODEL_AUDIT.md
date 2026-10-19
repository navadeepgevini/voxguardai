# Existing Authenticity Engine Audit

**Date:** 2026-10-18  
**Scope:** `backend/engines/aasist.py`, ECAPA, NLP, AMVTF, analyze routes, live frontend path  
**Method:** Static code review + config inspection + prior runtime smoke (joblib load observed)

## 1. Is AASIST a real AASIST neural net?

**No.** Despite the name, `AASISTAuthenticityEngine` is:

| Path | What runs |
|------|-----------|
| Upload `analyze_audio` | Hand-tuned acoustic heuristics only (jitter, STFT HF, kurtosis, silence gating, loudspeaker cutoff). **Does not call the sklearn model.** |
| Live `analyze_live_chunk` | Same heuristic family **plus** optional `trained_live_classifier.joblib` SoftVoting ensemble on 12 handcrafted features |

There is **no** Jung et al. AASIST graph neural network, no spectro-temporal attention GNN weights, and no end-to-end raw-waveform neural anti-spoofing stack in this repo.

## 2. Training data claimed by config

`trained_model_config.json` claims:

- Model: MasterTripleSoftVotingEnsemble (RF + ExtraTrees + HistGradientBoosting)
- ~139k chunks (43k human / 96k AI)
- CV accuracy **93.1% ± 0.22%** (cross-validation on training distribution — **not** a held-out ChatGPT/Gemini live-call benchmark)
- Platforms listed: ASVspoof tracks, WaveFake, ElevenLabs, OpenAI/Gemini labels, Indic TTS, telephony augmentation, etc.

**Caveat:** CV accuracy is not equivalent to TPR@1%FPR on unseen conversational generators. No reproducible eval suite was present in-repo before this workstream.

## 3. Pretrained weights present?

| Asset | Status |
|-------|--------|
| `trained_live_classifier.joblib` | **Present** on disk under `backend/engines/` |
| `trained_model_config.json` | Present |
| `calibrated_thresholds.json` | Present but **was unused** by engine code |
| Neural AASIST / WavLM / wav2vec checkpoints | **Absent** |

## 4. Inference & preprocessing

- Decode → mono float32 @ 16 kHz (PyAV → soundfile → PCM fallback)
- Features: F0/jitter, pitch CV/range, voiced HF ratio, STFT HF, Hilbert kurtosis, low-freq ratio, pause stats, entropy, ZCR
- Live ML: `predict_proba` → class-1 = AI probability
- Decision: threat_penalty scoring → authenticity in ~12–98 band (bimodal, **not** a calibrated probability)

## 5. Are outputs calibrated probabilities?

**No.** Authenticity is a heuristic score. `mlConfidence` exists on live path but authenticity mapping is piecewise and discontinuous. `calibrated_thresholds.json` was orphaned.

## 6. Accuracy metrics (measurable today)

| Metric | Evidence |
|--------|----------|
| CV accuracy (training) | 93.1% claimed in config — **not independently re-run here** |
| Precision/Recall/FPR/EER/AUROC on held-out live ChatGPT/Gemini | **Not measured** — no licensed eval set checked into repo |
| TPR @ 1% FPR | **Unknown** — aspirational target not currently evidenced |

## 7. Latency / memory (approximate)

| Component | Observation |
|-----------|-------------|
| Live chunk (~1–2 s WAV) | Heuristics + optional sklearn on CPU; typically tens of ms–low hundreds ms locally (not formally profiled) |
| Upload full file | STFT + frame loops scale with duration |
| Memory | sklearn ensemble + numpy/scipy; no GPU model |

## 8. Is live audio actually AI-inferred?

**Partially.** Frontend polls `POST /api/analyze/live` ~every 1.8 s with PCM WAV. Backend runs `analyze_live_chunk` (heuristics ± joblib). WebSocket `/ws/audio-stream` remains a **simulated** echo and is not the product path.

## 9. Failure modes on short / noisy / compressed speech

- Silence / low energy → returns authenticity **~92 SAFE** (false confidence)
- Short VoIP-like chunks → unstable F0/jitter → erratic penalties
- Codec / speakerphone AI (Gemini/ChatGPT through speakers) may look “human” on jitter/pitch gates

## 10. Why advanced conversational AI may be labeled human

**Root cause (critical bug):** After biophysical “bona fide human” gates pass, live code set `threat_penalty = 0` and **cleared indicators**, wiping even strong ML AI probability. Natural ChatGPT/Gemini prosody often passes those gates.

Secondary causes:

- Upload path never uses the trained classifier
- No temporal aggregation across chunks (single-frame flips)
- No INSUFFICIENT_AUDIO / UNCERTAIN states
- Thresholds not loaded from calibration file
- Marketing labels oversell GNN/DistilBERT/ECAPA-TDNN

## Post-audit fixes landed (same workstream)

| Fix | Location |
|-----|----------|
| ML evidence no longer wiped by bio gates (`ml_prob >= 0.58` preserved) | `aasist.py` |
| Silence / short → `INSUFFICIENT_AUDIO` / `WAITING_FOR_SPEECH` (not ~92 SAFE) | `aasist.py` |
| `calibrated_thresholds.json` loaded | `aasist.py` |
| Upload path runs joblib features | `aasist.py` |
| Session EMA aggregator (~3 s voiced) | `live_session.py`, `analyze.py` |
| AMVTF respects detection states (no TERMINATE on silence/uncertain alone) | `amvtf.py` |
| Live UI panel + `session_id` | `page.tsx`, `api.ts` |

## Verdict

Lab-grade detector with a useful optional sklearn ensemble on live chunks; critical false-confidence bugs addressed. **Still cannot claim ≥95% recall @ ≤1% FPR** without a licensed held-out conversational benchmark.
