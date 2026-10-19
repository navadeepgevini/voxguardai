# CodeMem: Architecture Decision Records (ADR)

## ADR-001: Separation of Preview and Analysis Spectrograms
- **Status**: Implemented & Verified
- **Context**: Users need immediate visual confirmation of audio frequency distribution after file selection without triggering backend inference or database mutation.
- **Decision**:
  - Implement client-side `AudioPreviewSpectrogram.tsx` using Web Audio API (512-point Hann FFT, Magma colormap, dB scale).
  - Implement backend `backend/engines/spectrogram.py` using Librosa STFT (normalized audio, full forensic metadata, base64 PNG stored in SQLite).
- **Consequences**: Zero wasted backend compute on unsubmitted files; cryptographic integrity of forensic evidence records preserved.

## ADR-002: Resend Incident Escalation Engine
- **Status**: Implemented & Verified
- **Context**: Critical security incidents (deepfake score >= 0.70) must alert the SOC team instantly.
- **Decision**:
  - Integrated Resend API in Next.js route handlers (`/api/notifications/trigger`).
  - Added dedicated email notification settings and verification status checks.
- **Consequences**: SOC responders receive immediate alerts containing audio filename, timestamp, confidence score, and forensic action links.

## ADR-003: Accessible shadcn/ui Foundation with Custom Dark SOC Theme
- **Status**: Implemented & Verified
- **Context**: Project requires accessible dialogs, tabs, tooltips, and tables without destroying the dark-navy/orange SOC aesthetic.
- **Decision**:
  - Integrate primitives via `@base-ui/react` and style them with existing CSS tokens (`--card`, `--primary`, `--border`).
- **Consequences**: WCAG compliance, full keyboard accessibility, zero visual regression.
