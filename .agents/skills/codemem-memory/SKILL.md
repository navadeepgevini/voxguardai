---
name: codemem-memory
description: >-
  Use this skill to inspect, retrieve, and update persistent project memory in .agents/memory/ (ADRs, work logs, environment setup, and limitations).
---

# CodeMem Persistent Memory Skill

## Memory Bank Architecture
- `codemem.json`: JSON memory catalog with IDs, categories, and timestamps.
- `decisions.md`: Architecture Decision Records (ADRs) with context, decisions, and consequences.
- `worklog.md`: Chronological log of changes, files modified, and verification results.
- `bugs-and-limitations.md`: Known boundaries, edge cases, and runtime constraints.
- `environment.md`: Active ports, services, and launcher commands.

## Maintenance Protocol
- **Before Major Work**: Read `decisions.md` and `bugs-and-limitations.md` to avoid repeating past mistakes.
- **After Completion**: Append a concise entry to `worklog.md` detailing changes and tests passed.
- **Zero Secrets**: Never commit passwords, tokens, API keys, or private user audio to memory files.
