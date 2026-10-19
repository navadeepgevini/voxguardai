---
title: VoxGuard AI — B.Tech Major Project Viva Voce Defense Guide
project: B.Tech Major Project — Deepfake Audio Authentication Guard
version: 1.0.0
tags:
  - viva-defense
  - examiner-questions
  - theory
  - acoustics
---

# VoxGuard AI — B.Tech Major Project Viva Voce Defense Guide

This document prepares the student for rigorous technical defense before internal and external examiners.

---

## 1. Core Engineering & Theory Questions

### Q1: What is the fundamental problem statement of VoxGuard?
**Examiner Answer**:
"Traditional telecommunications and voice biometric systems assume that live speech originates from a physical human vocal tract. However, modern zero-shot neural vocoders (like ElevenLabs, VALL-E, HiFi-GAN) can clone a victim's voice from just three seconds of reference audio. VoxGuard solves this by deploying a multi-signal defense system: it examines the physical acoustic properties of the audio signal to detect synthetic vocoder artifacts, verifies speaker identity against enrolled voiceprints, inspects conversational context for social engineering threats, and provides defensible visual STFT evidence for SOC analysts."

### Q2: What specific acoustic artifacts distinguish synthetic voice from human speech?
**Examiner Answer**:
"Neural vocoders reconstruct waveforms from Mel-spectrograms using inverse neural transforms. In doing so, they inevitably introduce telltale physical artifacts:
1. **Reduced Spectral Entropy**: Synthetic speech exhibits overly smooth harmonic tracks with unnaturally low randomness in the high-frequency spectrum.
2. **Abnormal Jitter & Shimmer**: Human vocal folds possess natural, involuntary micro-fluctuations in fundamental frequency (Jitter) and amplitude (Shimmer). Neural vocoders tend to produce mathematically rigid pitch contours with near-zero micro-jitter.
3. **High-Frequency Phase Discontinuities**: Because Mel filterbanks discard phase information, phase reconstruction algorithms frequently introduce high-frequency roll-off or comb-filtering artifacts above 4 kHz."

### Q3: Why does VoxGuard use a dual-spectrogram architecture?
**Examiner Answer**:
"We deliberately decoupled the **Client Preview Spectrogram** from the **Backend Evidence Spectrogram**:
- The **Preview Spectrogram** runs entirely on the client's browser using the Web Audio API. It performs an in-browser 512-point Hann FFT immediately upon file selection. This gives the analyst instant visual feedback and audio preview without consuming server CPU/GPU cycles or polluting the database with unanalyzed files.
- The **Analysis Evidence Spectrogram** is generated strictly on the backend from the normalized 16 kHz audio buffer passed into the inference model. It is persisted alongside the call record in SQLite as immutable forensic evidence for SOC audits."

### Q4: Explain the mathematical foundation of the Short-Time Fourier Transform (STFT) used in your spectrogram.
**Examiner Answer**:
"The Short-Time Fourier Transform segments a non-stationary audio signal $x[n]$ into short, overlapping quasi-stationary windows using a Hann window $w[n]$:
$$X(m, \omega) = \sum_{n=-\infty}^{\infty} x[n] \cdot w[n - m \cdot R] \cdot e^{-j \omega n}$$
Where $m$ is the time frame index, $\omega$ is the angular frequency, and $R$ is the hop size (256 samples). We then compute the power magnitude in decibels:
$$S_{\text{dB}}(m, \omega) = 20 \log_{10} (|X(m, \omega)| + \epsilon) - \max S_{\text{dB}}$$
This is mapped to the perceptually linear Magma colormap, where bright yellow corresponds to high energy concentration and dark purple/black represents acoustic noise floor."

### Q5: What is the AMVTF framework and why is multi-signal fusion necessary?
**Examiner Answer**:
"AMVTF stands for **Adaptive Multi-Signal Voicetagging Fusion**. A deepfake detector alone is insufficient in real-world fraud scenarios:
1. An authentic human could be an unauthorized imposter attempting account takeover.
2. An authentic human could be coerced into reading a fraudulent script under duress.
3. A synthetic voice could be used for an innocuous, benign message.
AMVTF solves this by fusing three independent signals:
$$\text{FusedRisk} = 0.50 \cdot (1 - \text{Authenticity}) + 0.30 \cdot (1 - \text{IdentityMatch}) + 0.20 \cdot \text{ContextRisk}$$
This ensures that both physical acoustic forgery and social engineering intent are evaluated together before escalating alerts."

---

## 2. Machine Learning, Datasets & Metrics

### Q6: What datasets were used and how did you partition them?
**Examiner Answer**:
"Our baseline model was trained and evaluated on 139,064 audio chunks combining the standard **ASVspoof 2019/2021 Logical Access (LA)** corpus with contemporary zero-shot diffusion vocoders (ElevenLabs, Bark, Google Cloud Neural2). Crucially, we enforced a **speaker-disjoint partition**: no human speaker or synthetic voice profile present in the training set appears in the validation or held-out test sets. This ensures our 93.1% accuracy and 5.4% Equal Error Rate reflect genuine generalization rather than speaker memorization."

### Q7: What is Equal Error Rate (EER) and why is it preferred over raw accuracy?
**Examiner Answer**:
"In biometric security and fraud detection, raw accuracy can be deeply misleading due to class imbalance. Equal Error Rate (EER) represents the exact operational threshold where the False Acceptance Rate (FAR — accepting a deepfake as genuine) equals the False Rejection Rate (FRR — rejecting genuine human speech). Our system achieves an EER of 5.4%, demonstrating strong discriminative power across both error modes."

### Q8: What are the primary failure modes of the model?
**Examiner Answer**:
"We transparently document two primary failure modes:
1. **Aggressive AI Noise Cancellation**: Software like Krisp or RTX Voice removes background noise by zeroing out spectral components, which can artificially mimic vocoder spectral flatness and increase false positives.
2. **Heavy Lossy Codec Compression**: Low-bitrate telephony codecs (such as AMR 4.75 kbps) discard upper harmonics above 3.4 kHz, which can mask vocoder artifacts. VoxGuard mitigates this by fusing context risk and speaker verification alongside acoustic signals."

---

## 3. System Architecture & Ethics

### Q9: How do you handle secrets and API keys?
**Examiner Answer**:
"We enforce a zero-leak policy. All sensitive credentials (`RESEND_API_KEY`, `SECRET_KEY`, `DATABASE_URL`) are isolated to server-side environment variables. No secrets are ever exposed in frontend bundles (no `NEXT_PUBLIC_` secrets), git commits, or documentation. The repository includes an updated, safe `.env.example` with placeholders only."

### Q10: Why does VoxGuard enforce Human-in-the-Loop (HITL) review instead of automatically blocking calls?
**Examiner Answer**:
"AI models provide probabilistic risk assessments, not legal certainties. Automatically terminating calls or freezing financial accounts based on an automated AI score introduces catastrophic risks of locking out legitimate customers due to background noise or poor cellular reception. VoxGuard provides immediate alerts to SOC analysts with verifiable spectrogram evidence, allowing human experts to confirm incidents before taking punitive action."
