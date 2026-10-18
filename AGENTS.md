# VoxGuard AI — Antigravity Agent Configuration & Repository Harness

This workspace integrates four foundational AI agent architectures:
1. **[ayghri/i-have-adhd](https://github.com/ayghri/i-have-adhd)** — High-clarity, action-first, distraction-free execution.
2. **[affaan-m/ecc](https://github.com/affaan-m/ecc)** — Everything Claude Code production agent harness, testing rigor, and context conservation.
3. **[msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents)** — 147+ specialized agent personas with tailored VoxGuard SOC subagents.
4. **[kyrolabs/awesome-agents](https://github.com/kyrolabs/awesome-agents)** — Autonomous agent taxonomy, architectural patterns, and evaluation frameworks.

---

## 1. ADHD Cognitive Mode (Default Operational Standard)
- **Lead with Action**: The very first line of any technical response must be an actionable diff, command, or executable step. Zero introductory fluff.
- **Max 5 Items**: Strict cap of 5 items per checklist or summary. Longer workflows must be split into "Do Now" vs. "Do Next".
- **Restate State**: Always anchor progress with explicit state counters (e.g., `[Step 2 of 4]`).
- **End with Next Step**: Every response concludes with exactly one concrete, immediate next action.
- **Matter-of-Fact Errors**: Report errors with root cause and fix immediately. Skip apologies and recaps.

---

## 2. ECC Production Harness Protocols
- **Surgical Edits**: Target only the lines of code that require modification. Never rewrite entire files unnecessarily.
- **Context Preservation**: Avoid re-summarizing unchanged code or existing artifacts. Keep token usage disciplined.
- **Verification First**: Verify changes against running services (FastAPI on `:8000`, Next.js on `:3000`) before declaring completion.
- **Zero Blast Radius**: Never break existing features (Audio Upload, Live Mic, Spectrograms, Call History, Identities, Settings, Resend email alerts).

---

## 3. Agency Agent Personas
Specialized personas available in `.agents/subagents/`:
- `sec-analyst`: SOC Deepfake & Audio Biometric Incident Responder
- `audio-ml-engineer`: Audio Signal Processing, AASIST/ECAPA-TDNN & Spectrogram Forensics Specialist
- `fullstack-dev`: Next.js 16 (App Router) + FastAPI Architecture Specialist
- `qa-auditor`: Evidence Verification & Audio Pipeline Compliance Auditor

---

## 4. Awesome Agents Architectural Patterns
- **Dual Pipeline Separation**: Local Web Audio Hann FFT (client preview) vs. Backend Librosa STFT (forensic evidence).
- **Incident Escalation**: Real-time evaluation triggering Resend automated security notifications upon deepfake confirmation.
- **Audit Trails**: Complete cryptographic and metadata logging for every ingested audio frame in SQLite `calls` table.
