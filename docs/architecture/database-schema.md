---
title: Database Schema Reference
tags:
  - database
  - sqlite
  - schema
  - dbhub
---

# Database Schema Reference

The VoxGuard database stores call logs, identity profiles, deepfake detection metrics, evidentiary spectrograms, and notification delivery history.

## Entity Relationship Diagram

```mermaid
erDiagram
    CALLS {
        string id PK
        string caller_id
        datetime timestamp
        float duration
        float deepfake_score
        string verdict
        text spectrogram_image
        text spectrogram_meta
        string audio_path
        string status
    }

    IDENTITIES {
        string id PK
        string full_name
        string voice_print_hash
        datetime enrolled_at
        string risk_level
    }

    NOTIFICATION_LOGS {
        string id PK
        string call_id FK
        string recipient_email
        string status
        datetime sent_at
    }

    CALLS ||--o{ NOTIFICATION_LOGS : "triggers"
```

## Table Specifications

### `calls` Table
- `id` (TEXT, PK): Unique UUID or safe call identifier.
- `caller_id` (TEXT): Phone number, SIP URI, or uploaded filename.
- `timestamp` (DATETIME): Time of ingestion/inference.
- `deepfake_score` (REAL): Model synthetic confidence `[0.0, 1.0]`.
- `verdict` (TEXT): Classification outcome (`AUTHENTIC`, `SUSPICIOUS`, `DEEPFAKE`).
- `spectrogram_image` (TEXT): Base64 data URI of the backend-generated analysis spectrogram.
- `spectrogram_meta` (TEXT): JSON containing sample rate, FFT size, hop length, time range, frequency range.

## Related Documents
- [[audio-analysis-pipeline|Audio Analysis Pipeline]]
- [[../development-tooling|DBHub Tooling]]
