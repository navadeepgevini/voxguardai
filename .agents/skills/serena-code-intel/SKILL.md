---
name: serena-code-intel
description: >-
  Use this skill for semantic code navigation, symbol-aware search, dependency tracing across callers, and safe atomic refactorings using Serena.
---

# Serena Code Intelligence Skill

## Capabilities
- Locates symbol definitions across Python and TypeScript modules.
- Maps cross-file references and call hierarchies before modifying signatures.
- Executes atomic, safe refactoring across monorepo boundaries.

## Verification Checklist
1. Find all references to the target function or interface.
2. Formulate surgical edits preserving formatting and types.
3. Run `npm run build` and `pytest` immediately following any refactoring.
