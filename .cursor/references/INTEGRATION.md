# Connecting external agent repos to VoxGuard (Cursor)

Completed setup for Cursor IDE agent tooling on this project.

## Installed in this project

| Source | Status | Path |
|--------|--------|------|
| VoxGuard rules | Done | `.cursor/rules/voxguard-core.mdc`, `backend-fastapi.mdc`, `frontend-next.mdc`, `amvtf-engines.mdc` |
| Project guide | Done | `AGENTS.md` (repo root) |
| i-have-adhd | Done | `.cursor/skills/i-have-adhd/SKILL.md` |
| Custom skills | Done | `.cursor/skills/amvtf-analyze`, `deploy-voxguard` |
| ECC (selective Cursor adapter) | Done | `.cursor/rules/ecc-*.mdc` + `.cursor/skills/ecc-*` |
| Agency Agents (selective) | Done | `.cursor/rules/agency-*.mdc` (8 personas) |
| awesome-agents | Bookmark | `.cursor/references/awesome-agents.md` |

## Always-on vs on-demand

| Rule | alwaysApply |
|------|-------------|
| `voxguard-core.mdc` | true |
| `ecc-common-security.mdc` | true |
| Other `ecc-common-*` | false (invoke when needed) |
| `ecc-python-*` / `ecc-typescript-*` | false (glob-scoped) |
| `agency-*` | false — mention with `@agency-...` |
| Stack rules (`backend-fastapi`, etc.) | false — glob-scoped |

## How to invoke

```text
/i-have-adhd Fix live mic analyze dropping authenticity on short chunks

@agency-appsec-engineer Review backend/routers/auth.py and keys.py

@agency-frontend-developer Improve call-history evidence accordion a11y

@agency-ai-engineer Harden AASIST live ML path in backend/engines/aasist.py

@agency-threat-detection-engineer Map CRITICAL verdicts to alert policy

Use amvtf-analyze skill on /api/analyze/live

deploy-voxguard: wire Neon DATABASE_URL for Render
```

## Upstream refresh

Repos were cloned under `%TEMP%\voxguard-agent-repos\` for install:

- https://github.com/affaan-m/ECC
- https://github.com/msitarzewski/agency-agents
- https://github.com/ayghri/i-have-adhd (skill copied)
- https://github.com/kyrolabs/awesome-agents (bookmark only)

Re-copy ECC rules:

```powershell
$ecc = Join-Path $env:TEMP "voxguard-agent-repos\ECC\.cursor\rules"
Copy-Item "$ecc\common-security.md" "C:\voxguardai\.cursor\rules\ecc-common-security.mdc" -Force
```

Or re-run Agency Agents installer against this project:

```bash
cd /c/voxguardai
/c/Users/.../Temp/voxguard-agent-repos/agency-agents/scripts/install.sh \
  --tool cursor --no-interactive \
  --agent backend-architect,frontend-developer,code-reviewer,ai-engineer,appsec-engineer,threat-detection-engineer,database-optimizer,security-architect
```

## Note

These tools improve **Cursor development** on VoxGuard. They are not part of the FastAPI/Next.js runtime.
