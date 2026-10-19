---
name: agency-agents
description: >-
  Use this skill to orchestrate, route, and delegate technical tasks to specialized Agency Agent personas tailored for VoxGuard AI (SOC Analyst, Audio ML Engineer, Fullstack Dev, QA Auditor).
---

# Agency Agents Orchestration Skill
Origin: https://github.com/msitarzewski/agency-agents

## Available Personas

| Agent Name | Division | Primary Scope | System Tools |
| :--- | :--- | :--- | :--- |
| `sec-analyst` | Security / SOC | Deepfake incident response, biometrics forensics, Resend alerting | DB inspections, alert triggers |
| `audio-ml-engineer` | Engineering / ML | STFT spectrograms, AASIST/ECAPA-TDNN feature extraction, audio normalization | Librosa, PyTorch, NumPy |
| `fullstack-dev` | Engineering | Next.js 16 App Router, React 19, Tailwind CSS, FastAPI endpoints | Next.js, FastAPI, Uvicorn |
| `qa-auditor` | Testing & QA | Dual spectrogram verification, regression suites, pipeline compliance | Playwright, Pytest, Web Audio tests |

## Delegation Protocol
1. **Identify Problem Domain**: Match user intent to the appropriate persona.
2. **Context Packaging**: Pass only relevant file paths, error traces, and architectural requirements to the subagent.
3. **Execution & Handoff**: The persona executes within its bounded domain and returns structured findings back to the main agent.
4. **Integration**: The main agent reviews findings against VoxGuard constraints and applies verified changes.
