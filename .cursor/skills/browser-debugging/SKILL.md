---
name: browser-debugging
description: >-
  Browser Debug and QA using Chrome DevTools MCP when available. Redact cookies,
  tokens, passwords, and private audio. Falls back to manual DevTools checklist.
---

# Browser Debugging Skill

1. Check `.agents/tooling-flags.json` — if Chrome DevTools is not live, use manual QA.
2. Prefer authenticated local dashboard `http://localhost:3000` only with user consent.
3. Inspect console, network failures, layout, a11y, and Live Analysis / History / Identities / Settings flows.
4. **Never** include Authorization headers, cookies, passwords, API keys, or audio in reports.
5. Full persona: `.agents/subagents/browser-debugger.json`
