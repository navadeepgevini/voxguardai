---
title: Audio Analysis & Forensic Pipeline
tags:
  - audio-processing
  - stft
  - spectrogram
  - ml-pipeline
---

# Audio Analysis & Forensic Pipeline

VoxGuard employs a strict dual-mode acoustic pipeline to ensure instant client feedback while preserving evidentiary integrity for security operations.

```mermaid
sequenceDiagram
    autonumber
    actor User as Security Analyst
    participant Browser as Next.js Client
    participant WebAudio as Web Audio API
    participant Backend as FastAPI Backend
    participant Librosa as Librosa STFT Engine
    participant DB as SQLite DB
    participant Resend as Resend Alerting

    User->>Browser: Select audio file (.wav / .mp3)
    Browser->>WebAudio: Decode ArrayBuffer & Hann FFT
    WebAudio-->>Browser: Render Audio Preview Spectrogram (Preview Only)

    User->>Browser: Click "Evaluate / Start Analysis"
    Browser->>Backend: POST /api/analyze (multipart audio)
    Backend->>Librosa: Resample (16kHz) & STFT compute
    Librosa-->>Backend: High-res Magma PNG & metadata
    Backend->>Backend: AMVTF / AASIST inference
    Backend->>DB: Store record + spectrogram_image + metadata
    alt Verdict is Deepfake (Score >= 0.70)
        Backend->>Resend: Dispatch Priority Alert Email
    end
    Backend-->>Browser: Return verdict, scores, evidence image
    Browser-->>User: Display Analysis Evidence Spectrogram
```

## Pipeline Specifications

### 1. Client Preview Spectrogram
- **Component**: `echoguard/src/components/AudioPreviewSpectrogram.tsx`
- **Engine**: Browser Web Audio `AudioContext.decodeAudioData`
- **Window**: 512-point Hann FFT, 256-point hop length
- **Colormap**: Magma (perceptually linear from black to magenta to bright yellow)
- **Constraint**: Purely client-side; zero API requests, database rows, or email alerts.

### 2. Backend Analysis Evidence Spectrogram
- **Component**: `backend/engines/spectrogram.py`
- **Engine**: Librosa STFT / Matplotlib Agg
- **Resolution**: 1024/2048-point FFT, 512-point hop, 16 kHz standardized sampling
- **Persistence**: Stored in `calls` table (`spectrogram_image` base64 PNG + `spectrogram_meta` JSON).

## Related Documents
- [[system-overview|System Architecture Overview]]
- [[database-schema|Database Schema Reference]]
- [[../ui/page-hierarchy|UI Page Hierarchy]]
