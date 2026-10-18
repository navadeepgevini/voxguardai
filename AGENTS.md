# VoxGuard AI — Antigravity Agent Configuration & Repository Harness
**Lead Engineering & Project-Development System: B.Tech Major Project**

This workspace integrates foundational AI agent architectures, developer tooling, and academic major project standards:
1. **[ayghri/i-have-adhd](https://github.com/ayghri/i-have-adhd)** — High-clarity, action-first, distraction-free pair programming.
2. **[affaan-m/ecc](https://github.com/affaan-m/ecc)** — Everything Claude Code production agent harness, testing rigor, and context conservation.
3. **[msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents)** — Specialized SOC and engineering roles.
4. **[kyrolabs/awesome-agents](https://github.com/kyrolabs/awesome-agents)** — Autonomous agent taxonomy and evaluation.
5. **Tooling & MCP Integrations** — Context7, Chrome DevTools, DBHub, Serena, shadcn/ui, Obsidian/Graphify, CodeMem.

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

## 3. The 10 Specialized Project Agents (`.agents/subagents/`)

| Agent Persona | Role | Primary Responsibility |
| :--- | :--- | :--- |
| **`project-planner`** | Product & Project Planner | Milestones, backlog, scope boundaries, academic evaluation mapping |
| **`audio-ml-engineer`** | Audio ML & Deepfake Detection | Preprocessing, VAD, 12 acoustic features, AASIST inference, STFT spectrograms |
| **`fullstack-dev`** | Full-Stack Implementation | Next.js 16 App Router UI, FastAPI endpoints, real-time WebSocket streaming |
| **`browser-debugger`** | Browser QA Agent | Chrome DevTools testing, console/network auditing, accessibility |
| **`db-agent`** | Database & Migration Agent | DBHub read-only schema inspection, migrations, query performance |
| **`security-privacy-auditor`** | Security & Privacy Agent | Secrets protection, voiceprint consent, retention policy, ethics review |
| **`ui-quality-auditor`** | UI Quality & Accessibility | shadcn/ui, Emil Kowalski / Taste design engineering principles |
| **`academic-researcher`** | Academic Evidence Agent | B.Tech thesis documentation, mathematical equations, citations |
| **`eval-test-agent`** | Evaluation & Test Agent | ASVspoof benchmarks, 93.1% accuracy validation, EER curves, test plans |
| **`codemem-knowledge-agent`**| Project Memory & Knowledge | CodeMem persistent memory bank, Obsidian knowledge vault in `docs/` |

---

## 4. Academic Documentation Vault (`docs/`)
- [[docs/current-system-audit|Baseline System Audit]]
- [[docs/architecture|System Architecture]]
- [[docs/data-flow|Data Flow Pipeline]]
- [[docs/model-card|AASIST/AMVTF Model Card]]
- [[docs/evaluation|Model Evaluation Report]]
- [[docs/testing|Verification & Test Plan]]
- [[docs/security-privacy|Security & Ethics Architecture]]
- [[docs/deployment|Deployment Runbook]]
- [[docs/external-agent-sources|External Sources Audit]]
- [[docs/project-memory|Project Memory & ADRs]]
- [[docs/demo-script|Evaluator Demo Script]]
- [[docs/viva-preparation|Viva Voce Defense Guide]]
