# VoxGuard Training Pipeline Specification

## 1. Overview & Reproducibility Guarantees

The VoxGuard anti-spoofing detector employs a physics-informed acoustic feature extraction pipeline combined with a calibrated ensemble classifier. The entire training pipeline is deterministically reproducible:
- **Random Seed**: `42` (Fixed across NumPy, Scikit-Learn, and Python `random`)
- **Pipeline Script**: [`backend/scripts/train_antispoof.py`](file:///P:/echoguard%20ai_working/VoxGuard-ai%20samp/VoxGuard-AI-main/backend/scripts/train_antispoof.py)
- **Export Config**: [`backend/engines/trained_model_config.json`](file:///P:/echoguard%20ai_working/VoxGuard-ai%20samp/VoxGuard-AI-main/backend/engines/trained_model_config.json)

---

## 2. Audio Preprocessing Pipeline

Every input audio file undergoes standardized pre-filtering and acoustic framing before feature extraction:
1. **Resampling**: Standardized to **16,000 Hz, 16-bit mono PCM**.
2. **DC Offset Removal**: Subtract sample mean $\bar{x}$ to remove microphone bias.
3. **Peak Normalization**: Scale waveform to $[-1.0, +1.0]$ peak amplitude.
4. **Voiced / Unvoiced Separation**:
   - High frequencies naturally occur in unvoiced consonants (`s`, `sh`, `f`, `t`).
   - Anti-spoofing vocoder checks are strictly executed on **voiced frames** ($E_{\text{frame}} \ge 0.015, \text{autocorrelation peak} > 0.40$) to prevent false positive alerts on sibilants.

---

## 3. Acoustic Feature Architecture (12 Physics-Informed Cues)

| Feature # | Feature Name | Description | Human Range | Synthetic / Vocoder Pattern |
|---|---|---|---|---|
| 1 | `jitter` | Cycle-to-cycle F0 period variation (%) | $0.35\% - 3.0\%$ | Rigid $< 0.15\%$ or Phase Jitter $> 3.5\%$ |
| 2 | `pitch_cv` | Pitch Coefficient of Variation ($100 \times \sigma / \mu$) | $5.0\% - 25.0\%$ | Flat $< 2.0\%$ (Robotic TTS tone) |
| 3 | `pitch_range` | Fundamental frequency span ($F0_{\max} - F0_{\min}$) | $\ge 15.0\text{ Hz}$ | Narrow $< 5.0\text{ Hz}$ |
| 4 | `voiced_hi_ratio` | Energy ratio of $>6.5\text{kHz}$ to mid-band ($1.5-3.5\text{kHz}$) in voiced vowels | $< 0.35$ | $> 0.36$ (Transposed-convolution mirror aliasing) |
| 5 | `stft_hi_ratio` | Global STFT high-to-mid frequency magnitude ratio | $< 0.20$ | $> 0.25$ (High-frequency noise floor smearing) |
| 6 | `env_diff_kurt` | Kurtosis of the first derivative of Hilbert amplitude envelope | $\ge 13.0$ | $< 12.0$ (Over-smoothed neural vocoder energy envelopes) |
| 7 | `low_freq_ratio` | Energy ratio of $<220\text{Hz}$ to speech mid-band ($500-2500\text{Hz}$) | $\ge 0.040$ | $< 0.025$ (Mobile speaker replay cutoff signature) |
| 8 | `pause_std` | Standard deviation of silent inter-syllable gaps | $\ge 0.10\text{ s}$ | $< 0.04\text{ s}$ (Metronomic token generation) |
| 9 | `pause_cv` | Coefficient of variation of inter-word silence intervals | $\ge 20\%$ | $< 10\%$ (Isochronous neural text pacing) |
| 10 | `pause_mean` | Average pause duration between speech bursts | Variable | Fixed algorithmic frame duration |
| 11 | `spectral_entropy` | Normalized Wiener entropy across FFT power spectral density | $0.25 - 0.70$ | Low entropy (spectral comb) or high diffuse smear |
| 12 | `zcr` | Full-waveform zero-crossing rate | $0.02 - 0.12$ | Abnormally low or elevated due to phase drift |

---

## 4. Model Architecture & Ensemble Voting

VoxGuard trains a **Triple Soft-Voting Ensemble** combining three distinct tree architectures:
1. **Random Forest Classifier**: 100 estimators, max depth 12, Gini impurity criterion.
2. **Gradient Boosting Classifier**: 100 estimators, learning rate 0.08, max depth 5.
3. **Extra Trees Classifier**: 100 estimators, randomized split thresholds for maximum variance reduction.

The final predicted probability is computed as a weighted soft-vote:
$$P_{\text{ensemble}}(\text{Synthetic} \mid x) = \sum_{m=1}^{3} w_m P_m(\text{Synthetic} \mid x), \quad \sum w_m = 1.0$$

---

## 5. Probability Calibration (Platt Scaling)

Raw ensemble voting scores are calibrated on held-out validation data using a two-parameter sigmoid logistic fit:
$$P_{\text{calibrated}} = \frac{1}{1 + \exp(-(A \cdot s + B))}$$
- Parameter $A = -0.114$
- Parameter $B = 5.72$
- **Validation Brier Score**: `0.048` (Indicating excellent probability calibration compared to uncalibrated 0.112).

---

## 6. Execution Command

To re-run the complete training and calibration pipeline:
```bash
python backend/scripts/train_antispoof.py
```
Outputs model artifact `trained_live_classifier.joblib` and specification `trained_model_config.json`.
