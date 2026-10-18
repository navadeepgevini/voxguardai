---
title: VoxGuard AI — Current System Audit & Technical Baseline
project: B.Tech Major Project — Deepfake Audio Authentication Guard
date: 2026-10-18
version: 1.0.0
audit_type: Comprehensive Technical & Academic Baseline Audit
---

# VoxGuard AI — Current System Audit & Technical Baseline

## 1. Executive Summary & Project Context
VoxGuard AI is a Security Operations Center (SOC) style deepfake audio detection and speaker verification platform. This audit establishes the concrete baseline of all functioning components, real versus simulated logic, security boundaries, and architectural integration points prior to major-project enhancements.

---

## 2. Fullstack Codebase Inventory

### A. Frontend Architecture (`echoguard/`)
- **Framework**: Next.js 16.3.4 (App Router, Turbopack, React 19.2.8).
- **Styling**: Tailwind CSS v4, Base-Nova theme, dark-navy (`#060B18`, `#0A1128`) and orange accent (`#F97316`) SOC aesthetic.
- **Active Routes**:
  1. `/` (Dashboard): Real-time analysis intake, local audio upload, audio preview player, dual spectrogram displays, Live Mic stream intake, threat score gauges.
  2. `/call-history`: Forensic audit log of analyzed calls, search/filter controls, and inline accordion evidence viewer (`[👁 Evidence]`).
  3. `/identities`: Consented voiceprint registry, enrollment forms, speaker verification status.
  4. `/settings`: Detection sensitivity sliders (AASIST, ECAPA-TDNN, NLP), email alert recipient management, and Resend delivery tests.
  5. `/login`: Operator/analyst session authentication.
- **Component Primitives (`src/components/ui/`)**:
  - Existing: `card.tsx`, `button.tsx`, `badge.tsx`, `progress.tsx`, `avatar.tsx`, `separator.tsx`.
  - Recently Added: `dialog.tsx`, `tabs.tsx`, `tooltip.tsx`, `table.tsx` (all WCAG compliant, `@base-ui/react` primitives).
- **Spectrogram Implementations**:
  - `AudioPreviewSpectrogram.tsx`: Client-side Web Audio Hann FFT (512-point FFT, 256-point hop, Magma colormap). Operates strictly in-browser; zero backend state mutation.
  - `AnalysisEvidenceSpectrogram.tsx`: Renders official backend-generated STFT PNG returned from normalized inference audio.

### B. Backend Architecture (`backend/`)
- **Framework**: FastAPI (Python 3.13 / Uvicorn).
- **Core Router Endpoints**:
  - `POST /api/analyze/audio`: Multipart audio ingest (`.wav`, `.mp3`, `.flac`, `.ogg`). Decodes audio, computes STFT spectrogram evidence, runs AMVTF multi-signal fusion, logs call record, and dispatches background alerts.
  - `POST /api/analyze/live`: Real-time chunk intake from live mic stream.
  - `GET /api/calls`: Retrieves historical records with pagination and verdict filters.
  - `GET /api/calls/{id}/evidence`: Returns evidentiary STFT spectrogram PNG and metadata.
  - `POST /api/calls`: Persists call record and triggers asynchronous notification checks.
  - `GET / POST /api/identities`: Voiceprint management and profile enrollment.
  - `GET / POST /api/settings`: Read/write detection thresholds.
- **Detection & Acoustic Engines**:
  - `backend/engines/aasist.py`: Feature extractor computing 12 physical acoustic metrics: Spectral Centroid, Spectral Roll-off, Spectral Flatness, Spectral Flux, Spectral Entropy, Zero-Crossing Rate (ZCR), Pitch/F0 stability, Jitter (relative frequency perturbation), Shimmer (amplitude perturbation), Kurtosis, Skewness, and High-Frequency Energy Ratio (HFER). Includes a trained RandomForest/ML classifier (139,064 ASVspoof/ElevenLabs/Gemini audio chunks, 93.1% CV accuracy).
  - `backend/engines/ecapa.py`: ECAPA-TDNN speaker verification engine comparing live audio embeddings against enrolled voiceprints in SQLite.
  - `backend/engines/nlp.py`: Speech-to-text transcription engine (via SpeechRecognition/Google Speech API) and threat keyword regex detector (impersonation, wire transfers, urgent OTP requests).
  - `backend/engines/amvtf.py`: Adaptive Multi-Signal Voicetagging Fusion fusing Authenticity (0.50), Identity (0.30), and Contextual Risk (0.20) into a single bounded Threat Score `[0.0, 1.0]`.
  - `backend/engines/spectrogram.py`: Librosa / SciPy STFT engine computing normalized spectrogram PNGs with complete metadata (sample rate, FFT window, hop length, time/frequency range).

### C. Database Architecture (`backend/database.py`)
- **Engine**: SQLite (`backend/voxguard.db`) with transparent Cloud PostgreSQL fallback via `PostgresConnectionWrapper`.
- **Primary Entities**:
  - `calls`: Historical call records, scores, verdicts, `spectrogram_data` (Base64 PNG), `spectrogram_metadata` (JSON).
  - `voice_profiles`: Enrolled identities, voiceprint embeddings, confidence, status.
  - `users`: Analyst accounts, salt, PBKDF2-SHA256 password hashes, roles.
  - `sessions`: Bearer token sessions with expiration.
  - `settings`: Versioned global detection thresholds and notification policies.
  - `notification_jobs`: Incident alert queue, idempotency keys, delivery status.

---

## 3. Real vs. Simulated Logic Assessment

| Subsystem | Real Implementation | Simulated / Fallback Mode |
| :--- | :--- | :--- |
| **Audio File Decode** | `scipy.io.wavfile` & `soundfile` decoding real PCM bytes | Browser fallback: "Preview spectrogram unavailable" if codec unsupported |
| **STFT Spectrogram** | Real Hann-windowed STFT computed via Web Audio (client) and `scipy.signal.stft` (backend) | Honest unavailable banner if audio buffer is empty |
| **Acoustic ML Features** | Real mathematical calculation of ZCR, Entropy, Jitter, Shimmer, Spectral Centroid | If audio length < 0.25s, returns Inconclusive with quality warning |
| **AMVTF ML Inference** | Real scikit-learn classifier trained on 139K audio chunks | Rule-based fallback if ML model weights file is missing |
| **Speaker Verification** | Cosine similarity against enrolled voiceprint vectors in SQLite | Returns `isMatch: False` and `0.0%` if no matching profile found |
| **Speech Transcription** | Real SpeechRecognition / Google STT on ingested audio | Skips transcription gracefully if offline; relies on acoustic signals |
| **Resend Notifications** | Live Resend API call if `RESEND_API_KEY` is present | **Demo Relay Mode**: Simulates successful queueing in console if key is placeholder |

---

## 4. Security & Privacy Audit
1. **Zero Secret Leaks**: Verified that all API keys, PostgreSQL passwords, and Resend credentials use environment variables only. No hardcoded secrets in source files.
2. **Audio Retention**: Audio bytes are decoded in memory (`io.BytesIO`); raw multi-gigabyte audio files are not committed to Git.
3. **Authentication**: Operator login requires PBKDF2-HMAC-SHA256 hashed passwords with cryptographically secure per-user salts.
4. **CORS & Input Validation**: FastAPI restricts CORS to configured origins; file uploads enforce audio MIME-types and bounded byte lengths.

---

## 5. Identified Areas for B.Tech Major Project Evolution
1. **Academic Documentation Vault**: Need formal thesis-ready architecture, data-flow, model card, testing, evaluation, and ethics documentation in `docs/`.
2. **Dataset & Evaluation Methodology**: Explicitly document ASVspoof 2019/2021, ElevenLabs, and multi-platform synthetic audio evaluation splits.
3. **Demo Script & Viva Preparation**: Create structured examiner walkthrough and viva defense guide for academic review.
4. **Safety & Ethics Policy**: Formalize human-in-the-loop review guidelines and prevent automated punitive actions.
