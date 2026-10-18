---
name: ecc-workflows
description: >-
  Use this skill when performing deep engineering audits, test-driven bug fixes, architectural refactoring, or verifying code quality against production agent harness standards.
---

# ECC (Everything Claude Code) Production Workflows
Origin: https://github.com/affaan-m/ecc

## 1. Pre-Flight Architecture Audit
Before writing or modifying production code:
1. Identify all callers and dependents of the target module.
2. Confirm active ports and backend/frontend processes.
3. Review schema migrations before touching data layers.

## 2. Test-Driven Development (TDD) Pattern
When adding or fixing audio processing / API capabilities:
1. Write a minimal reproduction test or script in `backend/tests/` or scratchpad.
2. Observe expected failure.
3. Apply surgical implementation to make the test pass.
4. Verify no regressions across adjacent modules.

## 3. Surgical Code Diffs
- Use `replace_file_content` targeting the specific block instead of overwriting the full file.
- Keep whitespace, indentation, and existing docstrings identical.
- Never strip error handlers or fallback branches.

## 4. Verification Checklist
- Run Next.js production build: `npm run build` inside `echoguard/`.
- Validate FastAPI route registration: test API endpoints via curl or Python `requests`.
- Confirm clean Git working tree before push.
