# Model Comparison — Synthetic Speech Detection

**Date:** 2026-10-18  
**Constraint:** Prefer reproducible, licensed checkpoints; CPU-first for Render; no blind multi-GB downloads.

## Current production path (baseline)

| Item | Value |
|------|--------|
| Architecture | Handcrafted 12-D features + SoftVoting (RF + ExtraTrees + HGB) |
| Asset | `backend/engines/trained_live_classifier.joblib` |
| Claimed CV acc | 93.1% ± 0.22% (training distribution; **not** held-out live ChatGPT/Gemini) |
| Live latency | Typically tens–low hundreds ms / ~1.8 s chunk on CPU (informal) |
| License | Local artifact; training corpora mixed (verify before redistribution) |

## Candidate families (research shortlist)

| Family | Strengths | Risks for VoxGuard | License / availability notes |
|--------|-----------|--------------------|------------------------------|
| **AASIST** (Jung et al., ICASSP 2022) | Strong in-domain ASVspoof 2019 LA (~0.83% EER for full AASIST; ~0.99% AASIST-L) | Needs PyTorch + weights; large domain gap (InTheWild EER ~40%+ in public arena tables); not ChatGPT Voice | Official: https://github.com/clovaai/aasist ; HF mirrors e.g. SpeechAntiSpoofingBenchmarks/AASIST — verify license + checksum before vendoring |
| **WavLM + linear/MLP head** | Robust SSL features; good cross-domain | Large memory; fine-tune data required | Microsoft WavLM (check Hugging Face model card) |
| **wav2vec 2.0 / XLS-R** | Mature SSL anti-spoof pipelines | Same: fine-tune + calibration | Fairseq / HF; check model cards |
| **HuBERT** | Complementary errors vs mel/vocoder cues | Similar cost to WavLM | Meta / HF |
| **RawNet2 / LCNN** | Lighter classical anti-spoof | Weaker on modern neural TTS | Challenge baselines |

## Selection rule (evidence-based)

Do **not** ship a second neural stack until:

1. Baseline harness reports metrics on the same eval set.
2. Candidate shows **meaningful** gain in TPR@1%FPR or EER on **held-out / unseen generators**.
3. p95 latency fits live SOC budget on target hardware (CPU or dedicated inference worker).
4. License + checksum verified.

## Ensemble policy

Ensemble (sklearn + neural) only if validation fusion improves TPR@1%FPR without inflating FPR. Use **calibrated** fusion weights on a separate val split — no arbitrary fixed weights.

## Hardware fit (current stack)

| Host | Realistic path |
|------|----------------|
| Render free/standard CPU | Keep sklearn + heuristics; optional quantized small CNN later |
| GPU worker / dedicated inference | AASIST or WavLM-base head becomes feasible |
| Vercel | Frontend only — no model serving |

## Decision (current)

**Stay on improved sklearn + temporal aggregation** until licensed eval audio exists and a neural candidate beats baseline on measured TPR@1%FPR. Document any future switch in `ACCURACY_BENCHMARK.md`.

**Next neural candidate to trial (when data + RAM allow):** AASIST-L (~85k params) from [clovaai/aasist](https://github.com/clovaai/aasist) — smaller than full AASIST; still expect large domain gap vs conversational commercial TTS until fine-tuned.
