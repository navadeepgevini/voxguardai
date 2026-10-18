---
title: VoxGuard AI — External Agent Reference & Vetting Audit
project: B.Tech Major Project — Deepfake Audio Authentication Guard
version: 1.0.0
tags:
  - agent-sources
  - security-audit
  - license-compliance
  - governance
---

# VoxGuard AI — External Agent Reference & Vetting Audit

## 1. Governance & Safe Adoption Policy
To maintain absolute security, zero runtime bloat, and prevent supply-chain vulnerabilities, external agent repositories are treated as **untrusted references** until formally audited. 

### Mandatory Adoption Constraints:
1. **Zero Blind Execution**: No third-party installer scripts (`install.sh`, `curl | bash`, untrusted npm packages) are executed directly in the project environment.
2. **No Repository Ingestion**: External repositories are not cloned into the VoxGuard source tree.
3. **Selective Extraction**: Only architectural patterns, prompt specifications, and role definitions are adapted into native Antigravity IDE configuration files (`.agents/`).
4. **License Compatibility**: All adopted concepts must be compatible with permissive open-source licenses (MIT, Apache 2.0).

---

## 2. External Repository Audit Log

| Source Repository | URL | License | Selected Capability | Adoption Decision | Technical & Academic Rationale | Review Date |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`ayghri/i-have-adhd`** | `https://github.com/ayghri/i-have-adhd` | MIT | Action-first communication, 5-item list cap, working memory state anchors | **ADOPTED (Full)** | Transformed into `.agents/rules/adhd-cognitive-clarity.md` and `.agents/skills/i-have-adhd/SKILL.md`. Drastically improves pair programming clarity and eliminates verbose AI pleasantries. | 2026-10-18 |
| **`affaan-m/ecc`** | `https://github.com/affaan-m/ecc` | MIT | Production agent harness, surgical diffing, test-driven verification, token economy | **ADOPTED (Full)** | Adapted into `.agents/rules/ecc-agent-harness.md` and `.agents/skills/ecc-workflows/SKILL.md`. Enforces non-destructive edits and prevents accidental code rewrites. | 2026-10-18 |
| **`msitarzewski/agency-agents`** | `https://github.com/msitarzewski/agency-agents` | MIT | Specialized agent persona system prompts and division-based role taxonomy | **ADOPTED (Selective)** | Selected 4 core SOC personas (`sec-analyst`, `audio-ml-engineer`, `fullstack-dev`, `qa-auditor`) adapted directly to VoxGuard's tech stack. Rejected remaining 140+ irrelevant marketing/finance roles to prevent context bloat. | 2026-10-18 |
| **`kyrolabs/awesome-agents`** | `https://github.com/kyrolabs/awesome-agents` | CC0 / MIT | Taxonomy of autonomous agent patterns, planning engines, and evaluation suites | **REFERENCE ONLY** | Synthesized into `.agents/AWESOME_AGENTS.md`. Used as an architectural reference for ReAct dual-pipeline separation; no external code or agent runtime libraries installed. | 2026-10-18 |

---

## 3. Rejected & Filtered Patterns
- **Monolithic Multi-Agent Frameworks (CrewAI / AutoGen / LangGraph runtime engines)**: Rejected for runtime application code. Antigravity IDE provides native subagent execution (`define_subagent` and `invoke_subagent`), avoiding heavy external Python dependencies and unpredictable token consumption.
- **Automated Git Hook Overrides**: Rejected third-party git pre-commit hooks that require global shell modifications, preserving clean developer control.
