# VoxGuard AI — Antigravity Agent Configuration & Repository Harness

This workspace integrates foundational AI agent architectures and specialized developer tooling:
1. **[ayghri/i-have-adhd](https://github.com/ayghri/i-have-adhd)** — High-clarity, action-first, distraction-free execution.
2. **[affaan-m/ecc](https://github.com/affaan-m/ecc)** — Everything Claude Code production agent harness, testing rigor, and context conservation.
3. **[msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents)** — Specialized SOC personas.
4. **[kyrolabs/awesome-agents](https://github.com/kyrolabs/awesome-agents)** — Autonomous agent taxonomy and evaluation.
5. **Tooling & MCP Integrations** — Context7, Chrome DevTools, DBHub, Serena, shadcn/ui, Obsidian/Graphify, Emil Kowalski Taste, CodeMem.

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

## 3. Specialized Workspace Agents (`.agents/subagents/`)

### Core SOC Personas
- `sec-analyst`: SOC Deepfake & Audio Biometric Incident Responder
- `audio-ml-engineer`: Audio Signal Processing, AASIST/ECAPA-TDNN & Spectrogram Forensics Specialist
- `fullstack-dev`: Next.js 16 (App Router) + FastAPI Architecture Specialist
- `qa-auditor`: Evidence Verification & Audio Pipeline Compliance Auditor

### Development Tooling Agents
- `context7-researcher`: Documentation Research Agent (Context7)
- `browser-debugger`: Browser Debug and QA Agent (Chrome DevTools MCP)
- `db-agent`: Database and Migration Agent (DBHub)
- `code-intel`: Code Intelligence and Refactoring Agent (Serena)
- `shadcn-ui-agent`: UI Component and Accessibility Agent (shadcn/ui base-nova)
- `knowledge-graph`: Knowledge Graph and Documentation Agent (Graphify + Obsidian)
- `ui-quality-auditor`: UI Quality Agent (Taste & Emil Kowalski Principles)
- `codemem-agent`: Persistent Project Memory Agent (CodeMem in `.agents/memory/`)

---

## 4. MCP Servers (`.agents/mcp_config.json`)
- `chrome-devtools-mcp`: Remote browser debugging on port 9222.
- `dbhub`: Safe read-only SQLite schema inspection (`backend/voxguard.db`).
- `context7`: Live documentation retrieval via `https://mcp.context7.com/mcp`.
- `serena`: LSP-backed semantic code intelligence (`oraios/serena`).
