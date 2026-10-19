---
title: System Architecture Overview
tags:
  - architecture
  - backend
  - frontend
---

# System Architecture Overview

VoxGuard AI is an enterprise-grade biometric security and synthetic media defense platform. It protects telecommunications channels, audio recordings, and voice authentication workflows from deepfake audio attacks and caller impersonation.

## Architecture Diagram

```mermaid
graph LR
    subgraph Browser ["Frontend (Next.js 16)"]
        UI["SOC Dashboard"]
        WAC["Web Audio Engine"]
        UI --> WAC
    end

    subgraph Service ["Backend (FastAPI)"]
        API["REST & WS Router"]
        AASIST["AMVTF / AASIST Engine"]
        STFT["Librosa STFT Engine"]
        API --> AASIST
        API --> STFT
    end

    subgraph Storage ["Persistence Layer"]
        DB[("SQLite Repository (voxguard.db)")]
        AASIST --> DB
        STFT --> DB
    end

    subgraph External ["External Services"]
        Resend["Resend Email API"]
        API --> Resend
    end

    UI -->|HTTP / WS| API
```

## Related Documents
- [[audio-analysis-pipeline|Audio Analysis & Forensic Pipeline]]
- [[database-schema|Database Schema Reference]]
- [[notification-system|Notification System]]
- [[../ui/page-hierarchy|UI Page Hierarchy]]
