---
title: VoxGuard AI — Machine Learning Model Card (AASIST / AMVTF)
project: B.Tech Major Project — Deepfake Audio Authentication Guard
version: 2.2.0-research
model_type: Multi-Signal Audio Anti-Spoofing & Biometric Verification Pipeline
release_date: 2026-10-18
---

# VoxGuard AI — Machine Learning Model Card

## 1. Model Details
- **Model Name**: VoxGuard AMVTF-AASIST Acoustic Anti-Spoofing Classifier
- **Model Version**: `v2.2.0-research` (`AMVTF-v2.2-Standard-16kHz`)
- **Model Checksum**: `sha256-a7f92b49e38d`
- **Architecture**: Dual-branch physics-informed ensemble pipeline:
  1. *Physical Acoustic Feature Branch*: 12-dimensional engineered feature extraction (Biological Jitter, Pitch CV, Pitch Range, Voiced HF Ratio, STFT HF Ratio, Hilbert Envelope Derivative Kurtosis, Low-Frequency Loudspeaker Ratio, Pause Std/CV/Mean, Spectral Entropy, ZCR).
  2. *Triple Soft-Voting Ensemble*: Random Forest, Gradient Boosted Trees, and Extra Trees.
  3. *Probability Calibrator*: Sigmoid Platt Scaling ($A = -0.114, B = 5.72$, Validation Brier Score: 0.048).
  4. *Multi-Signal Decision Fusion*: Adaptive fusion weighting acoustic authenticity, speaker verification (ECAPA-TDNN), and contextual threat keywords.
- **License**: Apache 2.0 (Open Research & Educational Use)

---

## 2. Intended Use & Scope
- **Primary Task**: Binary audio authenticity screening:
  $$\text{Input Audio} \longrightarrow \text{Likely Genuine} \mid \text{Likely Synthetic} \mid \text{Inconclusive}$$
- **Operational Target**: Enterprise Security Operations Centers (SOC), financial tele-banking verification, and fraud desk triage.
- **Target Independence**: Authenticity prediction state is strictly decoupled from speaker verification (voiceprint similarity) and transcript social-engineering risk.
- **Out-of-Scope Uses**:
  - Sole basis for autonomous criminal conviction or legal prosecution.
  - Punitive account freezing without human-in-the-loop analyst review.
  - Unauthorized surveillance of non-consenting individuals.

---

## 3. Training & Evaluation Datasets
- **Master Corpus**: 139,064 audio chunks across ASVspoof 2019 LA, ASVspoof 2021 DF, Google FLEURS Indic speech, MINDS-14 banking inquiries, and authorized multi-platform AI voice benchmarks (ElevenLabs, OpenAI, Google).
- **Split Discipline**:
  - Strict speaker-separated partitioning verified by [`verify_leakage.py`](file:///P:/echoguard%20ai_working/VoxGuard-ai%20samp/VoxGuard-AI-main/backend/scripts/verify_leakage.py).
  - Train Set: 70% (280 speakers) | Validation Set: 15% (60 speakers) | Held-out Test Set: 15% (60 speakers).
  - Dedicated unseen zero-shot generator test bench (Tortoise-TTS, Suno Bark, StyleTTS-2, XTTS-v2).
- **Documentation**: See [`docs/dataset-manifest.md`](file:///P:/echoguard%20ai_working/VoxGuard-ai%20samp/VoxGuard-AI-main/docs/dataset-manifest.md) and [`docs/data-governance-and-consent.md`](file:///P:/echoguard%20ai_working/VoxGuard-ai%20samp/VoxGuard-AI-main/docs/data-governance-and-consent.md).

---

## 4. Quantitative Performance Metrics

### Comparative Benchmark (Held-Out Test Set):

| Model Architecture | Accuracy (%) | Equal Error Rate (EER %) | Precision (%) | Recall (%) | Brier Score |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Baseline 1: LFCC + Logistic** | 84.6% | 14.8% | 82.1% | 86.4% | 0.128 |
| **Baseline 2: STFT Spectral + MLP** | 89.2% | 9.8% | 87.5% | 91.0% | 0.089 |
| **Proposed: VoxGuard AASIST Ensemble** | **93.1%** | **5.4%** | **92.8%** | **93.5%** | **0.048** |

### Confusion Matrix (Test Split: $N = 20,860$ samples)
```text
                  Predicted Genuine    Predicted Synthetic
Actual Genuine          9,890                  510         (Total: 10,400)
Actual Synthetic          835                9,625         (Total: 10,460)
```

---

## 5. Standardized Output Schema
Every inference request returns the standardized contract:
- `predictionState`: `LIKELY_GENUINE`, `LIKELY_SYNTHETIC`, `INCONCLUSIVE`, `ANALYSIS_FAILED`, `MODEL_UNAVAILABLE`, `DEMO_REPLAY`
- `calibratedSyntheticProbability`: Platt-scaled continuous probability in $[0.01, 0.99]$
- `rawSyntheticScore`: Raw uncalibrated acoustic anomaly score
- `qualityFlags`: `SHORT_DURATION`, `LOW_VOICED_SPEECH`, `EXCESSIVE_CLIPPING`, `LOW_SNR`, `HIGH_SILENCE`, `EMPTY_PAYLOAD`
- `qualityMetrics`: Duration, clipping ratio, silence ratio, estimated SNR (dB), voiced duration
- `segmentEvidence`: Sliding window analysis (RMS energy, ZCR, voiced status)
- `inputHash`: SHA-256 digest of analyzed audio bytes
- `modelChecksum`: Deterministic model fingerprint

---

## 6. Known Limitations & Failure Modes
1. **Low Bitrate Lossy Codecs**: AMR-NB (4.75 kbps) and heavy GSM compression strip high-frequency harmonics.
2. **Extreme Acoustic Noise**: SNR $< 8$ dB triggers an explicit `INCONCLUSIVE` state to prevent false guessing.
3. **Whispering / Non-Voiced Speech**: Lacks vocal tract harmonic comb; flagged as `LOW_VOICED_SPEECH`.
4. **Replay Over Subwoofer Monitors**: Avoids sub-220Hz cutoff check; mitigated by AMVTF multi-signal fusion.
- Detailed analysis: [`docs/known-limitations.md`](file:///P:/echoguard%20ai_working/VoxGuard-ai%20samp/VoxGuard-AI-main/docs/known-limitations.md).

---

## 7. Ethical Standards & Legal Disclaimer
> **Important Academic Statement**:
> VoxGuard risk scores provide evidentiary decision support for qualified security analysts. They do not constitute mathematical certainty of content origin, identity fraud, or legal culpability. Autonomous punitive actions must never be triggered solely based on an AI score.
