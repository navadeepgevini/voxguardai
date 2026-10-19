# VoxGuard AI — Antigravity Agent Customization Architecture

This directory (`.agents/`) integrates four premier agent repositories into the VoxGuard AI codebase according to the Google Antigravity IDE customization architecture:

```text
.agents/
├── rules/
│   ├── adhd-cognitive-clarity.md       <-- ayghri/i-have-adhd
│   ├── ecc-agent-harness.md            <-- affaan-m/ecc
│   └── voxguard-forensic-integrity.md  <-- VoxGuard domain rules
├── skills/
│   ├── i-have-adhd/
│   │   └── SKILL.md                    <-- ayghri/i-have-adhd
│   ├── ecc-workflows/
│   │   └── SKILL.md                    <-- affaan-m/ecc
│   ├── agency-agents/
│   │   └── SKILL.md                    <-- msitarzewski/agency-agents
│   └── spectrogram-forensics/
│       └── SKILL.md                    <-- Audio forensic runbook
├── subagents/
│   ├── sec-analyst.json                <-- SOC Deepfake & Biometrics Responder
│   ├── audio-ml-engineer.json          <-- Signal Processing & Anti-Spoofing ML
│   ├── fullstack-dev.json              <-- Next.js 16 & FastAPI Systems Engineer
│   └── qa-auditor.json                 <-- Forensic Evidence Compliance Auditor
├── AWESOME_AGENTS.md                   <-- kyrolabs/awesome-agents taxonomy
└── README.md                           <-- Master directory documentation
```

---

## The Four Connected Repositories

### 1. `ayghri/i-have-adhd`
- **Location**: `.agents/rules/adhd-cognitive-clarity.md` and `.agents/skills/i-have-adhd/SKILL.md`
- **Purpose**: Eliminates conversational fluff, enforces action-first answers, caps lists to 5 items, and provides explicit state anchors on every turn.
- **Trigger**: `/i-have-adhd` or asking for ADHD mode.

### 2. `affaan-m/ecc` (Everything Claude Code / Agent Harness)
- **Location**: `.agents/rules/ecc-agent-harness.md` and `.agents/skills/ecc-workflows/SKILL.md`
- **Purpose**: Production agent harness guidelines, context boundary enforcement, surgical diffs, defensive error handling, and test-driven verification before completion.

### 3. `msitarzewski/agency-agents`
- **Location**: `.agents/skills/agency-agents/SKILL.md` and `.agents/subagents/`
- **Purpose**: 4 custom Agency Agent personas tailored for VoxGuard:
  - `sec-analyst`: Security Operations Center deepfake incident responder.
  - `audio-ml-engineer`: Audio signal processing and anti-spoofing ML pipeline specialist.
  - `fullstack-dev`: Next.js 16 App Router & FastAPI full-stack systems engineer.
  - `qa-auditor`: Audio forensics and compliance auditor.

### 4. `kyrolabs/awesome-agents`
- **Location**: `.agents/AWESOME_AGENTS.md`
- **Purpose**: Comprehensive taxonomy of autonomous agent patterns (ReAct, Plan-and-Solve, Multi-Agent Debate, HITL escalation) and benchmarks applied to VoxGuard.

---

## Antigravity Discovery Standard
Antigravity discovers these configurations hierarchically by walking up to the workspace root:
- Rules in `.agents/rules/*.md` and project root `AGENTS.md` / `GEMINI.md` are automatically applied.
- Skills in `.agents/skills/*/SKILL.md` are discovered and dynamically activated on demand.
- Subagents in `.agents/subagents/*.json` are registered and invokable via `invoke_subagent`.

## MCP & specialized tooling (optional)

| File | Purpose |
|------|---------|
| `mcp_config.json` | Context7, Chrome DevTools, DBHub (readonly), Serena |
| `tooling-flags.json` | Configured vs live availability |
| `AGENT_REGISTRY.md` | Eight specialized agents + fallbacks |
| `memory/` | CodeMem (no secrets) |

Cursor users: copy `.cursor/mcp.json.example` → `.cursor/mcp.json` and set placeholder env vars.  
Full guide: `docs/development-tooling.md`.

**Critical:** FastAPI + Next.js remain fully usable if every MCP server is disabled.
