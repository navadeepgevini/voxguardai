# Specialized Agent Registry

All agents are **development assistants**. The VoxGuard app runs without them.

| Agent ID | Role | Primary tool | Skill | Fallback if tool offline |
|----------|------|--------------|-------|---------------------------|
| `context7-researcher` | Documentation Research | Context7 MCP | `.agents/skills/context7-research/` | `docs/`, WebSearch |
| `browser-debugger` | Browser Debug & QA | Chrome DevTools MCP | `.agents/skills/browser-debugging/` | Manual DevTools checklist |
| `db-agent` | Database & Migrations | DBHub MCP | `.agents/skills/database-inspection/` | DBCode / `database.py` |
| `code-intel` | Code Intelligence | Serena MCP | `.agents/skills/serena-code-intel/` | Grep/Glob/Read |
| `shadcn-ui-agent` | UI Components & A11y | shadcn/ui local | `.agents/skills/shadcn-accessibility/` | Existing `components/ui` |
| `knowledge-graph` | Knowledge Graph Docs | Graphify/Obsidian MD | `.agents/skills/graphify-obsidian/` | Edit `docs/` manually |
| `ui-quality-auditor` | UI Quality | Taste principles | `.agents/skills/ui-quality-polish/` | WCAG checklist |
| `codemem-agent` | Project Memory | CodeMem files | `.agents/skills/codemem-memory/` | Git log / ADRs |

## Safety (all agents)

1. Never log cookies, tokens, passwords, API keys, private audio, or transcripts.
2. No destructive DB actions without explicit user confirmation.
3. Prefer focused diffs; preserve VoxGuard navy/orange SOC identity.
4. App must remain usable if any MCP server fails to start.
5. Read `.agents/tooling-flags.json` before claiming a tool is live.

## Invoke (Antigravity / Cursor)

- Antigravity: `invoke_subagent` with name from `.agents/subagents/*.json`
- Cursor: `@` the matching rule/skill, or open this registry and follow the skill runbook
