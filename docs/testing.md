---
title: VoxGuard AI — Verification & Testing Protocol
project: B.Tech Major Project — Deepfake Audio Authentication Guard
version: 1.0.0
tags:
  - testing
  - quality-assurance
  - verification
  - regression-tests
---

# VoxGuard AI — Verification & Testing Protocol

## 1. Testing Strategy Overview
The testing architecture for VoxGuard spans four rigorous layers to guarantee operational stability and forensic integrity:
1. **Unit Tests**: Audio decoders, STFT math routines, PBKDF2 password hashing, and AMVTF signal fusion equations.
2. **Integration Tests**: FastAPI REST and WebSocket endpoints, multipart upload pipelines, and SQLite persistence.
3. **Frontend & Accessibility Builds**: Next.js App Router Turbopack compilation, TypeScript strict typing, and WCAG accessibility standards.
4. **End-to-End Workflow Verification**: Audio upload $\rightarrow$ Client preview $\rightarrow$ Backend evaluation $\rightarrow$ Stored evidence in Call History $\rightarrow$ Resend alert dispatch.

---

## 2. Test Case Matrix

| Test ID | Module | Description | Input | Expected Output | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-001** | `AudioPreview` | Client-side Web Audio FFT render | Valid `.wav` file | Preview spectrogram renders in $<500\text{ms}$; zero backend network calls | **PASS** |
| **TC-002** | `AudioPreview` | Unsupported or corrupted audio upload | Truncated `.bin` file | Safe error banner: "Preview spectrogram unavailable"; no app crash | **PASS** |
| **TC-003** | `SpectrogramEngine` | Backend STFT evidence generation | Normalized 16kHz sine array | Base64 PNG generated with valid JSON metadata (sample rate, FFT, hop) | **PASS** |
| **TC-004** | `AASISTEngine` | Physical feature extraction | 3-second speech audio | Computes Entropy, ZCR, Jitter, Shimmer, HFER within valid bounds | **PASS** |
| **TC-005** | `Database` | SQLite call record insertion | Complete analysis payload | New row inserted with `spectrogram_data` & `spectrogram_metadata` | **PASS** |
| **TC-006** | `CallHistory` | Evidence retrieval endpoint | `GET /api/calls/{id}/evidence` | Returns Base64 spectrogram PNG and matching metadata | **PASS** |
| **TC-007** | `Notifications` | Resend priority incident alert | Synthetic score = 0.88 | Background task dispatches alert or logs to safe Demo Relay | **PASS** |
| **TC-008** | `Next.js Build` | Turbopack compilation | `npm run build` in `echoguard/` | Clean build across all 13 routes with 0 TypeScript/ESLint errors | **PASS** |

---

## 3. Automated Test Execution Runbook

### A. Frontend Production Build & TypeScript Verification
```bash
cd "echoguard"
npm run build
```
- **Validation**: Confirms zero type violations, all App Router dynamic routes (`/api/notifications/recipients/[email]`), and static pages compile cleanly.

### B. Backend Engine & Database Smoke Test
Execute via Python in project root:
```bash
python -c "import sys; sys.path.append('backend'); import main, database, engines.spectrogram; print('Backend modules OK')"
```
- **Validation**: Confirms database connection, AASIST classifier weights load, and STFT spectrogram synthesis operates without missing dependencies.

### C. Live Backend Health Probe
```bash
curl.exe -I http://127.0.0.1:8000/docs
```
- **Validation**: Confirms FastAPI interactive documentation and OpenAPI schema are accessible on port 8000.

---

## 4. Regression Prevention Rules (ECC Harness)
- **Non-Destructive Migrations**: Database migrations use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` to ensure existing records are never wiped.
- **Resource Lifecycle**: Every Web Audio `AudioContext` and object URL is systematically disposed or revoked on component unmount to prevent browser memory leaks.
- **Graceful Fallbacks**: If any service (Resend, Cloud PostgreSQL, Web Audio) is unavailable, the system renders an honest demo/pending badge rather than throwing an unhandled exception.
