---
name: codemem-memory
description: >-
  Read and update VoxGuard CodeMem (architecture decisions, worklog, bugs, env).
  Never store secrets, tokens, private audio, or transcripts.
---

# CodeMem Skill

## Before major changes
Read `.agents/memory/codemem.json` and the relevant markdown file under `.agents/memory/`.

## After meaningful changes
Append a short entry to `worklog.md`: what changed, why, tests run, remaining limitations.

## Never store
API keys, passwords, tokens, `DATABASE_URL` credentials, private audio, sensitive transcripts.
