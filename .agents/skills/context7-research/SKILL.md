---
name: context7-research
description: >-
  Use this skill when researching official documentation for frameworks, packages, or APIs (Next.js, FastAPI, Librosa, Tailwind, Resend) using Context7 before making coding assumptions.
---

# Context7 Documentation Research Skill

## Capabilities
- Resolves official library identifiers (e.g., `/vercel/next.js`, `/tailwindlabs/tailwindcss`).
- Fetches version-specific documentation snippets, API parameters, and verified examples.
- Eliminates hallucinated functions or deprecated API syntax.

## Runbook
1. Identify the library name and API feature in question.
2. Query Context7 via CLI or MCP:
   ```bash
   npx ctx7 query --library <library-id> "<search-term>"
   ```
3. If Context7 is offline or `CONTEXT7_API_KEY` is unset, fall back to official documentation lookup or web search.
4. Extract precise types and signatures before drafting implementation code.
