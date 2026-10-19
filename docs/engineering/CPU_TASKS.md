# CPU Tasks (Laptop 1 — Ultra 7 165U / 32 GB / Intel Graphics)

**Hardware:** No NVIDIA CUDA on this machine. Prefer sklearn + heuristics + tooling.

| ID | Task | Priority | Status | Files | Acceptance | Hardware |
|----|------|----------|--------|-------|------------|----------|
| C01 | Baseline audit refresh | P0 | COMPLETED | `docs/engineering/BASELINE_AUDIT.md` | Matrix updated 2026-10-18 | CPU |
| C02 | Shared audio preprocess | P0 | COMPLETED | `backend/engines/audio_preprocess.py` | Unit tests pass | CPU |
| C03 | Detector interface | P0 | COMPLETED | `backend/engines/detector_interface.py` | sklearn backend works | CPU |
| C04 | Real WS live analyze | P0 | COMPLETED | `backend/main.py`, `ws_live.py` | `/ws/live-analyze` runs inference | CPU |
| C05 | Session EMA + detection states | P0 | COMPLETED | `live_session.py`, `aasist.py` | Tests pass | CPU |
| C06 | Metrics library | P0 | COMPLETED | `ml/metrics.py` | TPR@FPR/AUROC/EER smoke | CPU |
| C07 | Dataset manifest tooling | P0 | COMPLETED | `ml/dataset.py`, `scripts/init_eval_manifest.py` | Template created | CPU |
| C08 | Train entrypoint (CPU smoke) | P1 | COMPLETED | `ml/train_entrypoint.py` | Dry-run + skip without data | CPU |
| C09 | Eval harness | P0 | COMPLETED | `scripts/eval_authenticity_baseline.py` | Smoke JSON written | CPU |
| C10 | Live Analysis UI AI panel | P1 | COMPLETED | `echoguard/src/app/page.tsx` | States displayed | CPU |
| C11 | Auth/CORS/payment gates | P0 | COMPLETED | prior workstream | pytest deps | CPU |
| C12 | Expand API integration tests | P1 | IN PROGRESS | `backend/tests/` | Critical routes covered | CPU |
| C13 | Frontend typecheck/build | P1 | NOT STARTED | `echoguard/` | `npm run build` | CPU |
| C14 | DB indexes/migration notes | P2 | NOT STARTED | `database.py` | Documented | CPU |
| C15 | NLP scam lexicon expand | P2 | NOT STARTED | `nlp.py` | Unit tests | CPU |
| C16 | Real ECAPA pretrained (speechbrain) | P2 | BLOCKED | — | Needs model download approval | CPU-possible / large |
| C17 | CI workflow draft | P2 | NOT STARTED | `.github/workflows` | YAML only | CPU |
| C18 | GPU handoff docs + configs | P0 | COMPLETED | `docs/gpu-handoff/*` | Checklist exists | CPU |

Statuses: NOT STARTED · IN PROGRESS · COMPLETED · BLOCKED · REQUIRES GPU · REQUIRES APPROVAL · VERIFIED
