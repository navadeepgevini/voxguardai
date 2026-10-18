# Awesome Agents Taxonomy & Architectural Patterns for VoxGuard AI
Origin: https://github.com/kyrolabs/awesome-agents

This document maps autonomous agent frameworks, orchestration patterns, memory models, and evaluation suites to VoxGuard AI's SOC defensive architecture.

---

## 1. Agent Architectural Patterns

### A. Dual-Engine ReAct (Reasoning + Acting)
- **Concept**: Separate inspection from execution.
- **VoxGuard Mapping**:
  - *Phase 1 (Client Preview)*: Local Web Audio FFT calculates energy distribution immediately without committing state or issuing alerts.
  - *Phase 2 (Inference & Action)*: Backend ML pipeline processes normalized audio, computes evidentiary STFT, persists forensic records, and conditionally executes the Resend escalation action.

### B. Plan-and-Solve Multi-Agent Debate
- **Concept**: Cross-validation between specialized agent personas to reduce false positives.
- **VoxGuard Mapping**:
  - `audio-ml-engineer` evaluates acoustic frequency anomalies.
  - `sec-analyst` evaluates caller context, caller identity matching, and anomaly thresholds.
  - `qa-auditor` verifies data integrity before alerting.

### C. Human-in-the-Loop (HITL) SOC Review
- **Concept**: Autonomous detection with supervised escalation.
- **VoxGuard Mapping**:
  - High confidence deepfake (>85%): Automated priority email alert + call termination recommendation.
  - Medium confidence deepfake (70–85%): Flagged in Call History with `[👁 Evidence]` spectrogram badge for SOC manual review.

---

## 2. Integrated Framework Reference Matrix

| Framework Category | Core References | Application to VoxGuard |
| :--- | :--- | :--- |
| **Agent Orchestrators** | LangGraph, AutoGen, CrewAI | Multi-agent coordination between SOC, ML, and QA personas |
| **Code & Harness Agents** | Everything Claude Code (ECC), Claude Code, OpenCode | Production-grade code safety, surgical diffs, and context limits |
| **Cognitive Modifiers** | `i-have-adhd` | Action-first pair programming, bounded next steps, zero filler |
| **Persona Collections** | Agency Agents | Standardized specialized roles with deep domain prompts |
| **Audio & Biometric Toolkits** | Librosa, PyTorch, SciPy, Web Audio | Mathematical spectrogram synthesis, STFT windowing, acoustic analysis |

---

## 3. Evaluation & Benchmarking Standards
- **Acoustic Accuracy**: Verify that STFT frequency peaks correspond precisely to raw signal frequencies.
- **Latency Budget**: Client preview render within 500ms; backend analysis + email alert within 3.5 seconds.
- **False Alarm Rate**: Biometric speaker verification threshold calibrated to prevent legitimate voice lockout.
