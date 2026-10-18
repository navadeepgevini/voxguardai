---
title: VoxGuard AI — Machine Learning Model Card (AASIST / AMVTF)
project: B.Tech Major Project — Deepfake Audio Authentication Guard
version: 2.1.0
model_type: Multi-Signal Audio Anti-Spoofing & Biometric Verification Pipeline
release_date: 2026-10-18
---

# VoxGuard AI — Machine Learning Model Card

## 1. Model Details
- **Model Name**: VoxGuard AMVTF-AASIST Acoustic Anti-Spoofing Classifier
- **Model Version**: v2.1.0 (`AMVTF-v2.1-Preprocessed-16kHz`)
- **Architecture**: Dual-branch hybrid pipeline:
  1. *Physical Acoustic Feature Branch*: 12-dimensional engineered feature extraction (Spectral Centroid, Flatness, Flux, Entropy, ZCR, Pitch/F0 stability, Jitter, Shimmer, Kurtosis, Skewness, High-Frequency Energy Ratio).
  2. *Deep Statistical Classifier*: Ensemble Random Forest & Gradient Boosted Tree trained on multi-platform synthetic speech artifacts.
  3. *Multi-Signal Decision Fusion*: Adaptive fusion weighting acoustic authenticity, speaker verification (ECAPA-TDNN), and contextual threat keywords.
- **License**: Apache 2.0 (Open Research & Educational Use)

---

## 2. Intended Use & Scope
- **Primary Use Case**: Automated screening of inbound recorded calls and voice files for synthetic voice cloning, voice conversion, and deepfake impersonation.
- **Target Deployment**: Enterprise Security Operations Centers (SOC), financial tele-banking verification, and fraud desk triage.
- **Out-of-Scope Uses**:
  - Unsupervised autonomous legal prosecution or criminal conviction.
  - Punitive account freezing without human-in-the-loop analyst confirmation.
  - Surveillance of non-consenting individuals.

---

## 3. Training & Evaluation Datasets
- **Benchmark Corpus**: ASVspoof 2019 / 2021 Logical Access (LA) evaluation datasets.
- **Modern Vocoder Extension**: Augmented with 139,064 audio chunks synthesized across contemporary neural vocoders:
  - ElevenLabs Multilingual v1 & v2 (Diffusion-based zero-shot cloning)
  - OpenAI Whisper & TTS (16 kHz PCM)
  - Google Cloud Neural2 & Gemini Audio
  - HiFi-GAN & WaveGlow neural vocoders
- **Split Discipline**:
  - Strict speaker-separated partitioning (zero speaker overlap between Train, Validation, and Test splits).
  - Train Set: 70% | Validation Set: 15% | Held-out Test Set: 15%.
  - Zero test-set hyperparameter or threshold tuning.

---

## 4. Quantitative Performance Metrics

| Evaluation Metric | Score (Held-out Test Set) |
| :--- | :--- |
| **Cross-Validation Accuracy** | **93.1%** |
| **Equal Error Rate (EER)** | **5.4%** |
| **Precision (Synthetic)** | **94.2%** |
| **Recall (Synthetic)** | **92.0%** |
| **F1-Score (Synthetic)** | **93.1%** |
| **False Alarm Rate (FAR)** | **4.8%** |
| **False Rejection Rate (FRR)** | **6.1%** |

### Confusion Matrix (Test Split: $N = 20,860$ samples)
```text
                  Predicted Genuine    Predicted Synthetic
Actual Genuine          9,890                  510         (Total: 10,400)
Actual Synthetic          835                9,625         (Total: 10,460)
```

---

## 5. Input Requirements & Preprocessing
- **Audio Format**: Mono PCM WAV, MP3, FLAC, OGG.
- **Sample Rate**: Automatically resampled to 16,000 Hz.
- **Minimum Duration**: 0.25 seconds (recommended: $\ge 1.5$ seconds for optimal spectral entropy calculation).
- **Voice Activity Detection (VAD)**: Energy thresholding removes leading and trailing silence ($\le -40 \text{ dBFS}$) before feature computation.

---

## 6. Known Limitations & Failure Modes
1. **Low Bitrate Compression**: Heavy lossy codecs (e.g. GSM-FR 8 kbps, AMR-NB 4.75 kbps) strip high-frequency harmonics, increasing false positive rates.
2. **Extreme Background Acoustic Noise**: Signal-to-Noise Ratios (SNR) below 10 dB degrade spectral flatness and jitter reliability.
3. **Short Audio Snippets**: Recordings under 0.25 seconds trigger an `INCONCLUSIVE` verdict with an explicit acoustic warning.
4. **Adversarial Noise Injections**: Deliberate adversarial perturbations designed to mimic natural jitter can deceive raw acoustic classifiers; mitigated by AMVTF multi-signal fusion.

---

## 7. Ethical Standards & Legal Disclaimer
> **Important Academic Statement**:
> VoxGuard risk scores provide evidentiary support for qualified security analysts. They do not constitute mathematical certainty of content origin, identity fraud, or legal culpability. Autonomous punitive actions must never be triggered solely based on an AI score.
