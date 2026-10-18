# VoxGuard Research & Engineering Experiment Log

## Experiment Register

| Exp ID | Date | Objective | Hypothesis / Change | Result / Metric | Status |
|---|---|---|---|---|---|
| **EXP-01** | 2026-09-15 | Baseline Spectral Entropy Evaluation | Global Wiener entropy across FFT bins can detect neural vocoder noise. | Acc: 78.2%, FP on unvoiced consonants: 24.5%. Sibilants (`s`, `sh`, `f`) falsely trigger deepfake alert. | Replaced by Voiced Segmentation |
| **EXP-02** | 2026-09-22 | Voiced Frame Separation | Restricting spectral aliasing checks strictly to voiced vowel frames will eliminate false positives on fricatives. | Sibilant false positives dropped from 24.5% to **3.2%**. Overall accuracy increased to 84.1%. | **Adopted into Core Engine** |
| **EXP-03** | 2026-09-29 | Pitch Dynamics & Micro-Tremor (Jitter) | Human vocal folds have physiological micro-jitter ($0.35\% - 3.0\%$), whereas neural TTS is either rigid or discontinuous. | Robotic neural TTS detected with 96.2% precision. Jitter $< 0.15\%$ proved to be a near-perfect marker for flat TTS. | **Adopted into Core Engine** |
| **EXP-04** | 2026-10-04 | Transposed-Convolution Vocoder Aliasing | HiFi-GAN and MelGAN upsampling layers produce mirror imaging in the $>6.5\text{kHz}$ band during voiced speech. | Acc on neural vocoders increased to 89.8%. Voiced high-frequency ratio threshold set to $0.36$. | **Adopted into Core Engine** |
| **EXP-05** | 2026-10-10 | Loudspeaker / Phone Replay Detection | Playing synthetic audio through a smartphone speaker introduces steep acoustic cutoff below 220 Hz. | Sub-220Hz to mid-band ratio $< 0.025$ successfully caught 91.4% of acoustic replay attempts. | **Adopted into Core Engine** |
| **EXP-06** | 2026-10-14 | Zero-Leakage Dataset Partitioning | Splitting datasets strictly by speaker identity and withholding 4 generator architectures ensures honest academic evaluation. | Zero speaker leakage verified across 280 train / 60 val / 60 test speakers. Script `verify_leakage.py` implemented. | **Standardized** |
| **EXP-07** | 2026-10-16 | Sigmoid Platt Scaling Probability Calibration | Fitting logistic parameters on validation data converts raw scores into true posterior probabilities. | Validation Brier score improved from **0.112** down to **0.048**. Operational profiles (`BALANCED`, `HIGH_RECALL`, `LOW_FP`) established. | **Adopted into Core Engine** |
| **EXP-08** | 2026-10-18 | Degraded Channel Robustness & Inconclusive Gating | Evaluated against G.711 telephony, MP3 32kbps, and SNR 10dB noise; added explicit `INCONCLUSIVE` uncertainty gating. | AASIST Ensemble achieved **93.1% overall accuracy** and **5.4% EER**, outperforming LFCC (14.8% EER) and STFT (9.8% EER). | **Current Production v2.2** |

---

## Detailed Notes on Key Milestones

### Milestone 1: The Sibilant False-Positive Breakthrough (EXP-02)
Early testing revealed that standard spectral flatness / entropy features flagged unvoiced consonants as vocoder noise because fricatives like `/s/` have massive high-frequency energy. By building an autocorrelation-based pitch tracker that isolates voiced frames ($E > 0.015, r_{\max} > 0.40$), the false-positive rate dropped drastically without losing synthetic vocoder sensitivity.

### Milestone 2: Generalization to Unseen Diffusion Vocoders (EXP-06 & EXP-08)
When tested on unseen generators (Tortoise-TTS, Suno Bark, StyleTTS-2), conventional frequency-domain classifiers experienced an accuracy drop of over 20%. VoxGuard retained **87.4% accuracy** on unseen generators by weighting biological micro-tremor and glottal wave snap (Hilbert envelope kurtosis), which synthetic models fail to reproduce authentically regardless of whether they use GANs or diffusion decoders.
