---
title: Development Tooling & Specialized Agent Infrastructure
tags:
  - tooling
  - mcp
  - agents
  - environment
---

# VoxGuard AI — Development Tooling & Specialized Agent Infrastructure

This document details the developer tooling, Model Context Protocol (MCP) servers, and specialized AI agents configured in this workspace.

---

## 1. Overview of Tools & Status

| Tool | Status | Integration Type | Fallback Strategy |
| :--- | :--- | :--- | :--- |
| **Context7** | Configured / Key Required | Remote MCP (`https://mcp.context7.com/mcp`) & CLI (`npx ctx7`) | Graceful offline mode: uses local documentation and web search if API key is unset |
| **Chrome DevTools** | Active & Registered | Native Antigravity MCP (`chrome-devtools-mcp`) | Headless automated test scripts if browser session is disconnected |
| **DBHub** | Active & Registered | Local Stdio MCP (`@bytebase/dbhub` v1.5.0) | Direct Python SQLite connector (`backend/database.py`) |
| **Serena** | Configured / LSP Bridge | Open-Source MCP Server (`uvx oraios/serena`) | Antigravity native symbol search and grep when LSP is unindexed |
| **shadcn/ui** | Fully Installed & Active | Base-Nova accessible component library | Core HTML5 accessible primitives |
| **Graphify + Obsidian** | Fully Installed & Active | Markdown knowledge vault (`docs/`) with Mermaid diagrams | Standard Markdown viewers |
| **Emil Kowalski / Taste** | Fully Installed & Active | Design engineering skill and UI Quality Agent | Standard WCAG compliance audit checklist |
| **CodeMem** | Fully Installed & Active | Project-scoped memory bank (`.agents/memory/`) | Git log and ADR review |

---

## 2. Specialized Agents & Roles

### 1. Documentation Research Agent (`context7-researcher`)
- **Role**: Retrieves official, version-accurate documentation for libraries (Next.js, FastAPI, Librosa, Tailwind, Resend) before coding.
- **Permissions**: Read-only outbound HTTP to `mcp.context7.com`.
- **Safety**: Never passes proprietary source code or credentials in documentation query prompts.

### 2. Browser Debug and QA Agent (`browser-debugger`)
- **Role**: Inspects console errors, failed network requests, layout glitches, accessibility trees, and user interactions.
- **Permissions**: Local Chromium process management on port 9222.
- **Safety**: Redacts cookies, authorization tokens, passwords, and private user audio from reports.

### 3. Database and Migration Agent (`db-agent`)
- **Role**: Inspects database schema, validates migrations, analyzes query execution plans, and verifies connection health.
- **Permissions**: Read-only SQL query execution by default.
- **Safety**: Prohibited from executing destructive DDL (`DROP`, `TRUNCATE`, `ALTER TABLE ... DROP`) without manual confirmation.

### 4. Code Intelligence and Refactoring Agent (`code-intel`)
- **Role**: Uses semantic code navigation to trace call hierarchies, locate symbol definitions, and execute atomic refactorings.
- **Permissions**: Local workspace filesystem read/write.
- **Safety**: Verifies all affected components before modifying files; runs build/test checks afterward.

### 5. UI Component and Accessibility Agent (`shadcn-ui-agent`)
- **Role**: Maintains accessible UI components (`dialog`, `tabs`, `tooltip`, `table`) while strictly preserving the dark-navy/orange SOC theme.
- **Permissions**: Local component filesystem read/write.
- **Safety**: Enforces ARIA attributes, keyboard navigation, and prevents generic design override.

### 6. Knowledge Graph and Documentation Agent (`knowledge-graph`)
- **Role**: Maintains the Obsidian knowledge graph in `docs/`, updating architecture notes, Mermaid diagrams, and feature relationships.
- **Permissions**: `docs/` directory read/write.
- **Safety**: Excludes secrets, API keys, credentials, and raw audio from all documentation.

### 7. UI Quality Agent (`ui-quality-auditor`)
- **Role**: Audits visual hierarchy, spacing tokens, responsive layouts, and loading/error states across desktop and mobile screens.
- **Permissions**: Read-only visual inspection and CSS styling review.
- **Safety**: Ensures zero visual regressions across all 13 application routes.

### 8. Persistent Project Memory Agent (`codemem-agent`)
- **Role**: Maintains project memory in `.agents/memory/` across architecture decisions (ADRs), work logs, and known limitations.
- **Permissions**: `.agents/memory/` directory read/write.
- **Safety**: Versioned, concise, zero sensitive operational data or credentials.

---

## 3. Environment Variables (Placeholders Only)

Add these variables to `.env.local` or `.env` as needed:

```bash
# Context7 Documentation API
CONTEXT7_API_KEY=ctx7_placeholder_api_key_here

# DBHub Gateway DSN
DBHUB_DSN=sqlite://backend/voxguard.db

# Chrome Remote Debugging Port
CHROME_DEBUG_PORT=9222

# Resend Incident Notification Engine
RESEND_API_KEY=re_placeholder_api_key_here
ALERT_FROM_EMAIL=onboarding@resend.dev
ALERT_TO_EMAIL=security-team@example.com
```

---

## 4. Local Setup Steps

### Context7 Setup
1. Sign up for a free key at [context7.com/dashboard](https://context7.com/dashboard).
2. Set `CONTEXT7_API_KEY=your_key` in your environment.
3. Test documentation query:
   ```bash
   npx ctx7 query --library /vercel/next.js "Server actions in App router"
   ```

### Chrome DevTools Setup
1. Launch Google Chrome with remote debugging enabled:
   ```bash
   chrome.exe --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome-debug"
   ```
2. The agent automatically connects via `chrome-devtools-mcp`.

### DBHub Setup
1. Verify the local database exists at `backend/voxguard.db`.
2. DBHub runs via `npx @bytebase/dbhub@latest --dsn "sqlite://backend/voxguard.db" --readonly`.

### Serena Setup
1. Requires `uv` or Python environment.
2. Run `uvx --from git+https://github.com/oraios/serena serena start-mcp-server --project .`.

---

## 5. How to Disable or Remove Integrations

- **Disable MCP Server**: Remove or comment out the server entry in `.agents/mcp_config.json`.
- **Disable Context7**: Unset `CONTEXT7_API_KEY`. The agent seamlessly falls back to local docs and web search.
- **Disable DBHub**: The backend functions independently using standard Python SQLite (`backend/database.py`).
- **Disable Chrome DevTools**: Close Chrome debug port 9222.
- **Remove shadcn Primitives**: Unused UI components in `echoguard/src/components/ui/` can be removed without breaking core dashboard features.
