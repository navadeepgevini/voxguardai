# VoxGuard / EchoGuard — Baseline Audit (refreshed)

**Date:** 2026-10-18  
**Workspace:** `C:\voxguardai`  
**Git:** Not a git repository (no `.git`)  
**Hardware (Laptop 1):** Intel Core Ultra 7 165U · ~31.4 GB RAM · **Intel(R) Graphics only (no NVIDIA CUDA)** · Python 3.12.5 · Node 25.8.0

## Executive verdict

**CPU-phase infrastructure is substantially improved; not production-ready for SOC deployment.**  
Authenticity path is heuristics + sklearn SoftVoting (joblib present). Real live HTTP + new `/ws/live-analyze` inference. Security gates from prior workstream reduce open-API risk. Neural AASIST GNN / ChatGPT·Gemini measured eval still pending data + GPU laptop.

## Hardware routing

| Work | Where |
|------|-------|
| App, API, UI, sklearn, WS, tests, manifests | **Laptop 1 (this machine)** |
| AASIST-L fine-tune, multi-model GPU bench | **Laptop 2 RTX 3060 6 GB** |

## Cursor tooling

Present under `.cursor/` (rules, skills). Upstream awesome-agents / ECC / agency-agents / i-have-adhd are **IDE guidance**, not runtime app plugins.

## Feature classification (2026-10-18)

| Feature | Class | Notes |
|---------|-------|-------|
| Auth session APIs | IV | PBKDF2 + `require_current_user` on critical routes |
| Analyze upload/live | IV/P | Real engines; live session EMA |
| AASIST-named authenticity | P | Heuristics + SoftVoting joblib — **not** Jung GNN |
| Detector interface | IV | `detector_interface.py` sklearn; torch stub |
| ECAPA-named identity | P | FFT 192-d, not pretrained ECAPA-TDNN |
| NLP fraud | P | ASR + keywords |
| AMVTF | IV | Detection-state aware |
| `/ws/audio-stream` | S | Simulated demo (auth gated) |
| `/ws/live-analyze` | IV | Real authenticity windows |
| Live mic UI | IV | HTTP 1.8s + AI detection panel |
| Calls / identities / settings | IU | Auth-gated; needs broader API tests |
| Payment UTR | S | Must not trust client UTR alone |
| Automated tests | IV | Growing pytest suite |
| CI/CD | M | No `.github` yet |
| ChatGPT/Gemini metrics | M | No authorized eval WAVs in repo |

Legend: IV verified · IU unverified · P partial · S simulated · M missing · B broken

## Critical residual risks

- No git → no commit-level experiment provenance yet
- Payment verification still needs provider-backed confirmation
- Multi-worker session aggregator needs Redis for horizontal scale
- Torch detector not wired until GPU checkpoint exists
