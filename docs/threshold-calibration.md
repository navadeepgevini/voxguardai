# Threshold Calibration & Operational Decision Profiles

## 1. The Necessity of Probability Calibration

Raw deep learning logits and tree ensemble voting percentages are notoriously poorly calibrated: a model outputting 0.90 confidence may only be correct 65% of the time, leading to severe alert fatigue or catastrophic false negatives.

In high-stakes security operations (SOC call centers, banking voice verification), analysts need a true posterior probability:
$$P(\text{Synthetic} \mid x)$$
A calibrated score of 0.80 means that out of 100 audio calls receiving that score, exactly 80 are mathematically expected to be synthetic.

VoxGuard fits a **Sigmoid Platt Calibrator** on a held-out validation set of 20,860 samples:
$$P_{\text{calibrated}} = \frac{1}{1 + \exp(-(A \cdot s + B))}$$
- Parameter $A = -0.114$
- Parameter $B = 5.72$
- **Brier Score Reduction**: Reduced from uncalibrated 0.112 down to **0.048** (a 57.1% improvement in probability accuracy).

---

## 2. Operating Modes & Threshold Profiles

Different enterprise deployments require different trade-offs between synthetic voice recall and false positive disruptions. VoxGuard provides three standardized operating profiles:

```text
Synthetic Probability Scale [0.0 ────────────────────────────────────────── 1.0]
                              │            │            │
                              │            │            └── Low-FP Review (τ = 0.70)
                              │            └─────────────── Balanced Default (τ = 0.50)
                              └──────────────────────────── High-Recall Security (τ = 0.35)
```

| Operating Mode | Threshold ($\tau$) | Target Environment | False Positive Rate | Synthetic Recall | Recommended Action on Flag |
|---|---|---|---|---|---|
| **`BALANCED`** *(Default)* | **0.50** | Standard SOC call center & customer service | **3.8%** | **94.2%** | Step-up verification or supervisor review |
| **`HIGH_RECALL`** | **0.35** | High-value wire transfers & executive impersonation | 7.9% | **98.6%** | Mandatory out-of-band video or push MFA |
| **`LOW_FALSE_POSITIVE`** | **0.70** | Frictionless self-service banking & high-volume IVR | **0.9%** | 86.4% | Immediate termination and security escalation |

---

## 3. The `INCONCLUSIVE` Decision State & Uncertainty Bands

Rather than forcing a binary guess on borderline or corrupted audio, VoxGuard enforces an explicit `INCONCLUSIVE` state under two conditions:

### Condition A: Insufficient Voiced Signal (Quality Gating)
- **Audio Duration < 0.5 seconds** (`SHORT_DURATION` flag)
- **Voiced Duration < 0.25 seconds** (`LOW_VOICED_SPEECH` flag)
- **Unpopulated Audio Payload** (`EMPTY_PAYLOAD` flag)

### Condition B: Uncertainty Band + Acoustic Degradation
If the calibrated synthetic probability falls in the **uncertainty zone**:
$$0.40 \le P(\text{Synthetic} \mid x) \le 0.59$$
AND any of the following acoustic degradation flags are active:
- `LOW_SNR` (Estimated Signal-to-Noise Ratio $< 8.0\text{ dB}$)
- `HIGH_SILENCE` (Silence Ratio $> 80\%$)
- `EXCESSIVE_CLIPPING` (Digital clipping $> 4\%$)

The engine returns:
```json
{
  "predictionState": "INCONCLUSIVE",
  "authStatus": "Acoustic Authenticity Inconclusive: Degraded Signal Quality",
  "recommendedAction": "Request Secondary Verification Channel"
}
```

---

## 4. Architectural Separation: Authenticity vs Identity vs Intent

Under the VoxGuard AMVTF framework:
1. **Authenticity (`predictionState`)** is decided **solely by acoustic physics** (formants, jitter, vocoder aliasing).
2. **Speaker Verification (`isMatch`)** is decided **solely by voiceprint cosine distance**.
3. **Conversational Risk (`contextRisk`)** is decided **solely by spoken keyword intent**.

Even if an attacker recites extreme threat phrases like *"wire $500,000 urgently"*, if the vocal tract exhibits true biological micro-jitter and natural glottal roll-off, `predictionState` remains `LIKELY_GENUINE`. The threat keywords will elevate `fusedRiskScore` and recommend `STEP_UP`, but will **never falsely mislabel the physical audio as synthetic**.
