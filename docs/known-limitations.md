# Known Limitations & Vulnerability Analysis

## 1. Scope & Responsible Disclosure

While VoxGuard achieves competitive academic performance (93.1% overall accuracy, 5.4% EER across multi-generator splits), audio anti-spoofing is an ongoing adversarial challenge. Responsible engineering requires clearly documenting edge cases, failure modes, and boundaries where human verification is required.

---

## 2. Identified Acoustic Failure Modes

### A. Severe Codec Cascading & Re-compression
- **Scenario**: Audio recorded on a smartphone, forwarded via WhatsApp (Opus lossy 16kbps), transmitted over GSM cellular network, and captured on a VoIP softphone.
- **Vulnerability**: Repeated lossy quantization rounds can discard subtle vocoder aliasing artifacts above 6.5 kHz and disrupt delicate phase relationships.
- **Mitigation**: VoxGuard detects high-frequency cutoffs and relies on lower-frequency F0 prosody and inter-syllable pause cadence.

### B. Pathological Dysphonia & Neurological Voice Tremor
- **Scenario**: Legitimate human speakers suffering from Parkinson's disease, spasmodic dysphonia, or severe laryngitis.
- **Vulnerability**: Pathological tremor can produce cycle-to-cycle jitter exceeding 3.5% or irregular envelope kurtosis, potentially triggering synthetic vocoder jitter warnings.
- **Mitigation**: Operators can enroll validated baseline voiceprints with documented dysphonia markers into the SQLite identity vault, allowing speaker verification to corroborate the caller.

### C. Whispering & Purely Unvoiced Speech
- **Scenario**: Callers communicating in a quiet whisper or whispering short security answers.
- **Vulnerability**: Whispered speech involves turbulent airflow without vocal fold vibration, meaning no fundamental frequency (F0) or harmonic comb exists to measure biological jitter.
- **Engine Response**: VoxGuard flags `LOW_VOICED_SPEECH` and defaults to `INCONCLUSIVE` rather than issuing an incorrect synthetic verdict.

### D. Professional Studio Pitch Correction (Auto-Tune)
- **Scenario**: Audio processed through aggressive commercial pitch-correction plugins (Celemony Melodyne, Antares Auto-Tune) before transmission.
- **Vulnerability**: Digital pitch snapping artificially eliminates biological pitch micro-variations, causing a human voice to exhibit the robotic pitch rigidity characteristic of early neural TTS.

### E. High-End Studio Monitor Replay Attacks
- **Scenario**: An attacker plays an AI voice through professional acoustic studio monitors (e.g., Genelec studio monitors with dedicated subwoofers down to 25 Hz) into a high-grade condenser microphone.
- **Vulnerability**: Cheap phone speaker cutoff (<220 Hz) checks will not trigger because the subwoofer successfully reproduces deep low-frequency formants.

---

## 3. Legal & Forensic Limitations

1. **Not Definitive Forensic Proof**:
   - VoxGuard's scores (`calibratedSyntheticProbability`, `authenticity`) represent probabilistic machine learning inferences, not infallible scientific certitude.
   - Results must **never** be used as the sole ground for criminal prosecution, employment termination, or legal liability without secondary human review.

2. **Unseen Future Architectures**:
   - While tested on four held-out zero-shot generators, entirely novel future synthesis paradigms (e.g., continuous-time physical fluid dynamic simulators) may exhibit acoustic properties not captured by current physical models.

---

## 4. Operational Best Practices

To safeguard enterprise workflows against these limitations:
- Enforce **Human-in-the-Loop (HITL)** triage for any alert flagged as `INCONCLUSIVE` or `WARNING`.
- Utilize the **tri-signal AMVTF fusion**: always cross-reference acoustic authenticity with ECAPA speaker identity matching and contextual semantic analysis.
- Require out-of-band step-up authentication (push notification, mobile authenticator, or live interactive challenge-response) for high-value transactions.
