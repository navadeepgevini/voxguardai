---
title: VoxGuard AI — Knowledge Graph Index
tags:
  - moc
  - architecture
  - deepfake-defense
  - knowledge-graph
---

# VoxGuard AI — Obsidian Knowledge Graph Index

Welcome to the VoxGuard AI knowledge vault. This graph documents the forensic deepfake audio detection architecture, data pipelines, API services, database models, and operational tooling.

```mermaid
graph TD
    ClientUI["[[ui/page-hierarchy|Next.js 16 UI]]"] --> WebAudio["[[architecture/audio-analysis-pipeline|Audio Preview Spectrogram]]"]
    ClientUI --> APIGw["[[api/routes-reference|FastAPI Route Handlers]]"]
    APIGw --> MLInference["[[architecture/audio-analysis-pipeline|AASIST / AMVTF Inference]]"]
    MLInference --> SpectrogramBackend["[[architecture/audio-analysis-pipeline|Evidence Spectrogram (STFT)]]"]
    MLInference --> DBStore["[[architecture/database-schema|SQLite DB (calls & spectrogram_meta)]]"]
    MLInference --> Escalation["[[architecture/notification-system|Resend Email Alert Engine]]"]
    ClientUI --> HistoryPage["[[ui/page-hierarchy|Call History & Forensic Details]]"]
    HistoryPage --> DBStore
    DevTools["[[development-tooling|Development Tooling & MCP]]"] -.-> ClientUI
    DevTools -.-> DBStore
```

---

## Knowledge Map of Content (MOC)

### 1. Architecture & Core Systems
- [[architecture/system-overview|System Architecture Overview]]: Monorepo architecture, Next.js frontend, and FastAPI backend microservice.
- [[architecture/audio-analysis-pipeline|Audio Analysis & Forensic Pipeline]]: Dual-mode spectrogram architecture (Web Audio preview vs. backend STFT evidence).
- [[architecture/database-schema|Database Schema Reference]]: SQLite tables, `calls` entity, indexes, migrations, and retention policies.
- [[architecture/notification-system|Notification & Alerting System]]: Incident escalation, Resend email dispatch, and SOC recipient management.

### 2. Interfaces & APIs
- [[ui/page-hierarchy|UI Page Hierarchy & Component Catalog]]: Dashboard, Live Analysis, Call History, Identities, Settings, and shadcn/ui components.
- [[api/routes-reference|API Routes Reference]]: REST endpoints, WebSocket streaming channels, and JSON payloads.

### 3. Developer Tooling & Integrations
- [[development-tooling|Development Tooling Guide]]: Context7, Chrome DevTools, DBHub, Serena, shadcn/ui, CodeMem, and specialized agent personas.
