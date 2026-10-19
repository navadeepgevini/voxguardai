---
title: Development Tooling & Specialized Agent Infrastructure
tags:
  - tooling
  - mcp
  - agents
  - environment
---

# VoxGuard AI — Development Tooling & Specialized Agent Infrastructure

Development-only tooling. **The VoxGuard application does not require any MCP server to start, analyze audio, or serve the SOC dashboard.**

Canonical configs:

| File | Purpose |
|------|---------|
| `.agents/mcp_config.json` | Antigravity / shared MCP server definitions |
| `.cursor/mcp.json.example` | Cursor MCP template (copy → `.cursor/mcp.json` locally) |
| `.agents/AGENT_REGISTRY.md` | Agent ↔ tool ↔ fallback map |
| `.agents/tooling-flags.json` | Live vs configured feature flags |
| `.agents/subagents/*.json` | Specialized agent personas |
| `.agents/skills/*/SKILL.md` | Skill runbooks |
| `.agents/memory/` | CodeMem project memory |

---

## 1. Environment discovery (2026-10-20)

Inspected this Cursor session’s tool catalog:

| Namespace | Status | Relevance |
|-----------|--------|-----------|
| `cursor` (AwaitShell, WebSearch, Task, …) | Ready | Always available |
| `user-dbcode.dbcode-extension-DBCode` | Ready | Safe DB inspection alternative to DBHub |
| `cursor-origin-readonly` | Error | Unrelated; needs auth repair separately |
| Context7 / Chrome DevTools / DBHub / Serena | **Not in live catalog** | Configured on disk; need user MCP enable + deps |

**Conclusion:** Agents and skills are installed in-repo. External MCP servers are **configured but not automatically connected** until you enable them in Cursor/Antigravity and provide env vars / Chrome / `uv`.

---

## 2. Tools — status matrix

| Tool | In-repo config | Live this Cursor session | Fallback |
|------|----------------|--------------------------|----------|
| **Context7** | Yes (`.agents/mcp_config.json`) | No — needs `CONTEXT7_API_KEY` + MCP enable | Local `docs/` + WebSearch |
| **Chrome DevTools MCP** | Yes | No — needs Chrome debug + `npx` | Manual DevTools QA |
| **DBHub** | Yes (readonly DSN) | No — needs `npx` + `DBHUB_DSN` | DBCode extension / `database.py` |
| **Serena** | Yes | No — needs `uvx` + Serena install | Grep / Glob / Read / explore agent |
| **shadcn/ui** | Yes (`echoguard` + `components/ui`) | Yes (source) | Existing UI primitives |
| **Graphify + Obsidian** | Yes (`docs/` Markdown vault) | Yes (files) | Manual Markdown |
| **UI Quality (Taste principles)** | Yes (skill + agent) | Yes (guidance) | WCAG checklist |
| **CodeMem** | Yes (`.agents/memory/`) | Yes (files) | Git history |

Graphify is treated as **Obsidian-compatible Markdown + Mermaid indexing**, not a mandatory CLI binary.

---

## 3. Specialized agents

| Agent | Responsibility | Must use tool when available | Must not |
|-------|----------------|------------------------------|----------|
| Documentation Research (`context7-researcher`) | Official package/API docs before coding | Context7 | Send secrets/source dumps to remote |
| Browser Debug (`browser-debugger`) | Console, network, a11y, flows | Chrome DevTools | Log cookies/tokens/passwords/audio |
| Database (`db-agent`) | Schema, migrations, query debug | DBHub / DBCode | DROP/TRUNCATE/prod writes without confirm |
| Code Intelligence (`code-intel`) | Symbol search, safe refactors | Serena | Broad rewrites without tests |
| UI Component (`shadcn-ui-agent`) | Accessible dialogs/tabs/tables | Local shadcn | Replace SOC navy/orange theme |
| Knowledge Graph (`knowledge-graph`) | Architecture & relationship docs | `docs/` vault | Secrets, transcripts, raw audio |
| UI Quality (`ui-quality-auditor`) | Hierarchy, spacing, responsive polish | Visual review skill | Copy proprietary branding/assets |
| Project Memory (`codemem-agent`) | ADRs, worklog, bugs, env notes | `.agents/memory/` | API keys, passwords, private data |

---

## 4. Environment variables (placeholders only)

Add to local `.env` / `.env.local` — **never commit real values**.

```bash
# --- App (existing) ---
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require
SECRET_KEY=change_me_to_random_64_hex
ALLOWED_ORIGINS=http://localhost:3000
ENVIRONMENT=development
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000

# --- Optional MCP tooling ---
CONTEXT7_API_KEY=ctx7_placeholder_api_key_here
DBHUB_DSN=sqlite:///./backend/voxguard.db
CHROME_DEBUG_PORT=9222

# --- Notifications (optional) ---
RESEND_API_KEY=re_placeholder_api_key_here
ALERT_FROM_EMAIL=onboarding@resend.dev
ALERT_TO_EMAIL=security-team@example.com
```

---

## 5. Local setup

### Context7
1. Create a key at [context7.com/dashboard](https://context7.com/dashboard).
2. Set `CONTEXT7_API_KEY`.
3. Copy `.cursor/mcp.json.example` → `.cursor/mcp.json` (or enable the same server in Antigravity).
4. Restart Cursor MCP. Verify Context7 tools appear in the tool catalog.

### Chrome DevTools
1. Start Chrome: `chrome.exe --remote-debugging-port=9222 --user-data-dir="%TEMP%\voxguard-chrome-debug"`
2. Enable `chrome-devtools-mcp` in MCP config.
3. Browser Debug Agent must redact auth material from any report.

### DBHub
1. Ensure local DB exists (`backend/voxguard.db` after first backend start) **or** set `DBHUB_DSN` to a non-production readonly DSN.
2. Keep `--readonly`. Never point DBHub at production with write access for agents.
3. Alternative already detected in Cursor: **DBCode** extension namespace.

### Serena
1. Install [`uv`](https://github.com/astral-sh/uv).
2. Enable Serena MCP entry; first run may download the package.
3. If Serena fails, Code Intelligence Agent must use Grep/Glob/Read.

### shadcn/ui
Already present (`shadcn` package + `echoguard/src/components/ui/*`). Add components only when needed:

```bat
cd echoguard
npx shadcn@latest add select
```

Preserve VoxGuard dark-navy / orange SOC styling in `globals.css`.

### Graphify / Obsidian
1. Open `docs/` (or `docs/knowledge/`) as an Obsidian vault.
2. Start from [[index]] / `docs/knowledge/graph-index.md`.
3. No secrets in vault notes.

### CodeMem
1. Before major work: read `.agents/memory/codemem.json` + relevant markdown.
2. After meaningful changes: update `worklog.md`, `decisions.md`, `bugs-and-limitations.md` as needed.

---

## 6. Disable / remove

| Integration | Disable |
|-------------|---------|
| Any MCP | Remove/comment server in `.agents/mcp_config.json` and local `.cursor/mcp.json` |
| Context7 | Unset `CONTEXT7_API_KEY` |
| DBHub | Unset `DBHUB_DSN`; use DBCode or Python |
| Chrome DevTools | Close debug Chrome; disable MCP server |
| Serena | Disable MCP server; keep Grep fallback |
| shadcn extras | Delete unused files under `echoguard/src/components/ui/` only if unused |
| CodeMem | Stop updating `.agents/memory/` (do not delete history casually) |

Set `"enabled": false` conceptually by removing the server block. App runtime is unaffected.

---

## 7. Permissions & safety

- MCP tools: local process spawn (`npx`/`uvx`), optional network (Context7), optional Chrome CDP.
- Database: readonly by default.
- Never commit `.env`, `.cursor/mcp.json` with real keys, browser profiles, or `*.db`.
- Feature flags: `.agents/tooling-flags.json` — update `live_in_cursor_session` when you verify a tool in-session.

---

## 8. Verification commands

```bat
cd C:\voxguardai\backend
python -m pytest tests -q --tb=line

cd C:\voxguardai\echoguard
npm install
npm run lint
npm run build
```

App health (no MCP required): `GET http://127.0.0.1:8000/api/health`
