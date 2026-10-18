# ECC (Everything Claude Code) Agent Harness Rules
Origin: https://github.com/affaan-m/ecc

Core engineering discipline and guardrails for agent pair programming:

## 1. Context Boundary & Token Economy
- Read only relevant portions of files using line slices (`StartLine`, `EndLine`).
- Never dump massive log streams into context.
- Keep diffs surgical and minimal; never replace entire files when modifying localized functions.

## 2. Test & Verification Rigor
- Every pipeline modification must be validated against runtime endpoints (`http://127.0.0.1:8000/docs`, `http://localhost:3000`).
- Always run pre-flight syntax and type checks (`npm run build` or `pytest`) before concluding.
- Re-verify database migrations with real queries before committing.

## 3. Defensive Error Recovery
- Isolate failures gracefully. A failure in audio decoding or alert sending must never crash the core application.
- Preserve fallback modes: when backend evidence is pending or unavailable, display honest fallbacks rather than mock data.

## 4. Git & Commit Hygiene
- Maintain atomic, descriptive commits following Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`).
- Verify git status and avoid committing temporary build artifacts, `.env` secrets, or raw audio files.
