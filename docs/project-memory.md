---
title: VoxGuard AI — CodeMem Project Memory & Decisions Synthesis
project: B.Tech Major Project — Deepfake Audio Authentication Guard
version: 1.0.0
tags:
  - project-memory
  - codemem
  - adr
  - decisions
---

# VoxGuard AI — CodeMem Project Memory & Decisions Synthesis

## 1. Memory Bank Architecture
VoxGuard maintains persistent engineering memory in `.agents/memory/` and synchronizes major project decisions here to preserve context across development sessions and pair programming turns.

---

## 2. Architecture Decision Records (ADR Summary)

### ADR-001: Client Preview vs. Backend Evidence Spectrogram Separation
- **Context**: Users need immediate visual inspection upon selecting a file, but official evidence must represent the exact preprocessed audio fed to ML models.
- **Decision**: Decouple client-side Web Audio Hann FFT (zero backend calls) from backend `scipy.signal.stft` (normalized 16 kHz audio, stored with Base64 PNG and metadata in SQLite `calls` table).
- **Impact**: Instant UI feedback without wasted backend GPU/CPU compute; zero unsubmitted files stored in the audit database.

### ADR-002: Dual-Channel SMTP & Resend Incident Escalation Engine
- **Context**: Deepfake detections ($P \ge 0.70$) must notify SOC responders immediately, but local evaluation environments often lack production email credentials.
- **Decision**: Implement server-side Resend API delivery backed by a safe, non-blocking **Demo Relay Mode** when `RESEND_API_KEY` is a placeholder.
- **Impact**: The application is 100% testable and runnable offline for B.Tech project demonstrations without throwing email network errors.

### ADR-003: Accessible shadcn/ui Integration with Custom Dark SOC Theme
- **Context**: The project required accessible modals, tabs, tooltips, and tables without overwriting the established dark-navy/orange SOC identity.
- **Decision**: Utilize `@base-ui/react` primitives and style them exclusively using existing project CSS tokens (`--card`, `--primary`, `--border`).
- **Impact**: WCAG compliance, full keyboard accessibility, zero visual regressions across all 13 routes.

---

## 3. Engineering Work Log & Milestones

| Timestamp | Milestone | Key Actions Completed | Verification Status |
| :--- | :--- | :--- | :--- |
| **2026-10-04** | Dual Spectrograms | Built `AudioPreviewSpectrogram.tsx` & `backend/engines/spectrogram.py` | Verified with WAV/MP3 uploads |
| **2026-10-17** | Call History Accordion | Integrated `[👁 Evidence]` inline accordion expansion in Call History | Verified in browser UI |
| **2026-10-18 (Turn 1)** | Agent Harness Setup | Connected `awesome-agents`, `ecc`, `agency-agents`, and `i-have-adhd` to `.agents/` | Git remote pushed to main |
| **2026-10-18 (Turn 2)** | Tooling & Memory | Added Context7, Chrome DevTools, DBHub, Serena, shadcn/ui, Obsidian vault, CodeMem | Clean build & test verification |
| **2026-10-18 (Turn 3)** | B.Tech Major Project Upgrade | Full academic documentation suite, 10 specialized agents, model card, evaluation report | Production build passing |

---

## 4. Known Technical Trade-Offs & Current Boundaries
1. **Model Scope**: Acoustic classifier is optimized for single-speaker recordings; overlapping multi-speaker dialogue requires diarization preprocessing.
2. **Lossy Codec Vulnerability**: Bitrates below 8 kbps degrade spectral flatness calculations; addressed via the AMVTF multi-signal weighted fusion.
3. **Storage Boundary**: SQLite operates reliably for up to 100,000 call records; production enterprise scale requires transitioning to Cloud PostgreSQL using the pre-configured `DATABASE_URL` wrapper.
