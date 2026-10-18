# CodeMem: Known Boundaries & Model Limitations

## 1. Browser Audio Codec Limits
- Web Audio `AudioContext.decodeAudioData` requires valid browser-supported codecs (standard PCM `.wav`, `.mp3`, `.ogg`, `.aac`).
- Exotic codecs or corrupted headers trigger safe fallback: "Preview spectrogram unavailable" without blocking manual audio upload.

## 2. Ingestion Sample Rate Standardization
- Inference models (AASIST, ECAPA-TDNN) expect standardized 16,000 Hz single-channel audio.
- Files recorded at 44.1 kHz or 48 kHz are resampled in backend memory before spectrogram generation and tensor inference.

## 3. Database Concurrency
- Local SQLite (`backend/voxguard.db`) operates in WAL mode with connection pooling.
- For high-concurrency production deployments, migrate to Cloud PostgreSQL using the configured `DATABASE_URL` environment variable.
