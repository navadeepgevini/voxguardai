# Data Governance, Ethics & Consent Policy

## Executive Summary

VoxGuard is developed under strict ethical AI principles and privacy regulations. As an audio anti-spoofing and security verification system, VoxGuard processes biometric voice signals. To ensure compliance, academic defensibility, and zero infringement on individual privacy rights, all data collection, training, evaluation, and operational procedures conform to this policy.

---

## 1. Core Ethical Principles

1. **Explicit Consent for Living Persons**:
   - VoxGuard prohibits collecting, scraping, synthesizing, cloning, or training on any living individual's voice without documented, informed written consent.
   - For demo profiles (e.g., enrolled internal executive profiles), recordings were obtained with verified consent forms specifying research evaluation usage only.

2. **No Scraping or Non-Consensual Mining**:
   - Zero voice data is collected by scraping social media, podcasts, YouTube, or consumer messaging platforms.
   - Zero vendor API scraping: Evaluation audio generated through commercial APIs (such as OpenAI, ElevenLabs, Google Cloud) used solely authorized, developer-tier paid accounts with explicit terms permitting synthetic output evaluation.

3. **Advisory Decision Support (Non-Accusatory)**:
   - VoxGuard's acoustic model does not claim to deliver definitive legal proof of guilt, fraud, or identity forgery.
   - Results are presented as probabilistic risk assessments (`LIKELY_GENUINE`, `LIKELY_SYNTHETIC`, `INCONCLUSIVE`) intended to empower human security analysts, not replace human judgment.

---

## 2. Biometric Data Protection & Privacy Compliance

VoxGuard adheres to international and national privacy standards, including the **EU General Data Protection Regulation (GDPR, Article 9 on Special Category Biometric Data)** and the **Indian Digital Personal Data Protection (DPDP) Act, 2023**:

### A. Local Edge Processing
- All feature extraction (FFT, STFT, Hilbert transform, F0 tracking, ZCR, entropy) and inference take place **locally on-premise** within the deployment environment.
- Raw voice files are **never** transmitted to external cloud inference vendors, telemetry pipelines, or third-party analytical services.

### B. Embedding Hash Minimization
- Speaker identity profiles enrolled in the local SQLite database store high-dimensional ECAPA-TDNN feature vectors (192-dimensional floating-point embeddings).
- Raw audio files used during enrollment are discarded immediately after embedding computation unless explicitly retained in an encrypted local audit vault by system administrators.
- Reverse engineering raw speech or intelligible audio from 192-d ECAPA embeddings is mathematically intractable without invertible decoder keys.

### C. Zero Retention for Transient Calls
- Live microphone chunks streamed to `/api/analyze/live` are processed in volatile memory. Audio buffers are discarded immediately after calculating acoustic scores, with zero disk caching.

---

## 3. Dataset Attribution & Integrity Register

| Dataset Name | Governing Body | Consent / License Architecture | Storage Location |
|---|---|---|---|
| **ASVspoof 2019 Logical Access** | EURECOM / Interspeech Special Interest Group | Non-commercial open scientific research consent | `backend/data/asvspoof19/` |
| **ASVspoof 2021 Deepfake** | ASVspoof Consortium | Open Academic Commons for Deepfake Audio Research | `backend/data/asvspoof21/` |
| **Google FLEURS (Indic Subset)** | Google Research | Creative Commons Attribution 4.0 International | `backend/data/fleurs/` |
| **MINDS-14 Telephony Inquiries** | PolyAI / Hugging Face | Open Data Commons Attribution License (ODC-By) | `backend/data/minds14/` |
| **Synthetic Vendor Test Bench** | VoxGuard Research Lab | Authorized Developer Accounts (OpenAI, ElevenLabs, Google) | `backend/data/authorized_synth/` |

---

## 4. Governance Verification Script

A data governance and split integrity test is included in the project test suite:
```bash
pytest backend/tests/test_antispoof_research.py -k "test_splits_zero_leakage"
```
This guarantees zero contamination between training speakers and held-out evaluation identities.
