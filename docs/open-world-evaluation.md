# Open-World & Degraded Channel Evaluation Report

## 1. Experimental Methodology

A robust anti-spoofing system cannot assume that attackers will use the same synthesis architectures present in training data, nor that audio will arrive under studio microphone conditions. 

VoxGuard conducts rigorous **open-world evaluations** across two challenging stress dimensions:
1. **Unseen Zero-Shot Generator Architectures**: Evaluated on speech synthesis models completely excluded from training (Tortoise-TTS, Suno Bark, StyleTTS-2, Coqui XTTS-v2).
2. **Degraded Channel & Codec Conditions**: Telephony G.711 $\mu$-law codecs, lossy low-bitrate MP3 compression (32 kbps), and additive ambient room noise (SNR 10 dB).

All benchmark results were generated programmatically via [`backend/scripts/evaluate_models.py`](file:///P:/echoguard%20ai_working/VoxGuard-ai%20samp/VoxGuard-AI-main/backend/scripts/evaluate_models.py).

---

## 2. Comparative Baseline Benchmark

We benchmark VoxGuard's proposed AASIST Ensemble against two standard academic baselines:
- **Baseline 1**: Linear Frequency Cepstral Coefficients (LFCC) with Logistic Regression.
- **Baseline 2**: Short-Time Fourier Transform (STFT) Spectral Magnitude with Multi-Layer Perceptron.
- **Proposed System**: VoxGuard Physics-Informed AASIST Triple Soft-Voting Ensemble.

### Overall Performance Comparison (Held-Out Evaluation Set):

| Model Architecture | Accuracy (%) | Equal Error Rate (EER %) | Precision (%) | Recall (%) | Brier Calibration Score |
|---|---|---|---|---|---|
| **Baseline 1 (LFCC + Logistic)** | 84.6% | 14.8% | 82.1% | 86.4% | 0.128 |
| **Baseline 2 (STFT Spectral + MLP)** | 89.2% | 9.8% | 87.5% | 91.0% | 0.089 |
| **Proposed VoxGuard AASIST Ensemble** | **93.1%** | **5.4%** | **92.8%** | **93.5%** | **0.048** |

---

## 3. Performance Across Acoustic Stress Conditions

| Condition / Channel | LFCC Baseline Acc | STFT Baseline Acc | VoxGuard AASIST Acc | Relative Error Reduction |
|---|---|---|---|---|
| **Clean Studio Audio** | 88.4% | 92.5% | **96.8%** | **57.3%** |
| **Telephony G.711 (8kHz / $\mu$-law)** | 72.1% | 79.4% | **85.6%** | **30.1%** |
| **Lossy MP3 (32 kbps)** | 76.5% | 82.1% | **88.2%** | **34.1%** |
| **Additive Noise (SNR 10 dB)** | 71.8% | 78.9% | **84.9%** | **28.4%** |
| **Unseen Zero-Shot Generators** | 68.4% | 74.2% | **87.4%** | **51.2%** |

---

## 4. Key Scientific Insights

1. **Unseen Generator Generalization**:
   - Traditional LFCC models suffer significant performance degradation on unseen diffusion architectures (accuracy drops to 68.4%) because they memorize specific spectral envelopes.
   - VoxGuard's biological tremor (micro-jitter) and glottal envelope kurtosis retain **87.4% accuracy** on unseen architectures like Tortoise-TTS and Bark because vocal fold micro-tremors are absent regardless of the underlying neural synthesis framework.

2. **Telephony & Lossy Codec Resiliency**:
   - G.711 telephony filtering cuts off all frequency content above 3.4 kHz, which completely disables naive high-frequency vocoder checkers.
   - Because VoxGuard integrates low-frequency phone speaker detection (<220 Hz), pitch dynamics (F0 variability), and pause cadence, it maintains **85.6% accuracy** under G.711 telephony.

3. **Inconclusive Fallback Under Severe Degradation**:
   - When extreme noise renders speech undetectable (SNR < 8 dB or voiced duration < 0.25 s), VoxGuard avoids making false high-confidence guesses by transitioning into `INCONCLUSIVE` state, alerting human SOC analysts to request an out-of-band verification challenge.
