# VoxGuard / EchoGuard — Master Project Development Checklist

**Updated:** 2026-10-18  
**Laptop 1:** Ultra 7 165U / 32 GB / Intel Graphics (no CUDA)  
**Laptop 2:** RTX 3060 6 GB (GPU phase)  
**Statuses:** `NOT STARTED` · `IN PROGRESS` · `BLOCKED` · `COMPLETED` · `VERIFIED` · `REQUIRES GPU`

> **VERIFIED** requires tests/commands with recorded evidence. Do not mark VERIFIED from intent alone.

---

## PHASE 1 — PROJECT ANALYSIS [CPU] P0

| Task | Status | Evidence |
|------|--------|----------|
| Analyze FE/BE source | COMPLETED | `docs/engineering/BASELINE_AUDIT.md` |
| Architecture review | COMPLETED | `ARCHITECTURE.md`, `PROJECT_ROADMAP.md` |
| Identify pages/components | COMPLETED | Live, History, Identities, Settings, Login |
| Identify API endpoints | COMPLETED | routers: auth, analyze, calls, identities, settings, keys, notifications |
| DB schemas | COMPLETED | `database.py` |
| AASIST/ECAPA/NLP/AMVTF audit | COMPLETED | `docs/ai/EXISTING_MODEL_AUDIT.md` |
| Pretrained NN actually present? | COMPLETED | sklearn joblib yes; Jung AASIST GNN **no** |
| Simulated/partial/missing | COMPLETED | BASELINE_AUDIT matrix |
| Auth/authz inspection | COMPLETED | `deps.py`, auth gates |
| Keys/billing/notifications | COMPLETED | UTR demo gate documented |
| WebSocket / live analysis | COMPLETED | `/ws/live-analyze` real; `/ws/audio-stream` simulated |
| Tests & deploy configs | COMPLETED | pytest suite; `render.yaml` |
| Blocking bugs identified | COMPLETED | KNOWN_ISSUES.md |
| Architecture diagrams | COMPLETED | LIVE_DETECTION_ARCHITECTURE + engineering ARCHITECTURE |
| Prioritized roadmap | COMPLETED | PROJECT_ROADMAP.md / CPU_TASKS / GPU_TASKS |

---

## PHASE 2 — BACKEND [CPU] P0

| Task | Status | Evidence |
|------|--------|----------|
| FastAPI starts | VERIFIED | TestClient imports `main:app`; health 200 in tests |
| Fix broken endpoints | COMPLETED | Auth-gated analyze; honest health |
| Request/response models | COMPLETED | `models.py` + detection fields |
| Missing REST APIs | COMPLETED | Core SOC APIs present |
| Validation | COMPLETED | Pydantic + upload checks |
| Error handling | COMPLETED | Central handlers in `main.py` |
| Centralized exceptions | VERIFIED | `RequestValidationError` + generic handler |
| Structured logging | COMPLETED | logging.basicConfig + logger |
| Auth dependencies | VERIFIED | `require_current_user` |
| RBAC where required | IN PROGRESS | Role field exists; not all admin routes enforce role |
| DB connections | COMPLETED | SQLite/Postgres wrapper |
| Async/sync correctness | COMPLETED | Sync DB under FastAPI (acceptable for SOC scale) |
| Audio upload validation | VERIFIED | size + `validate_upload` |
| File size/duration limits | COMPLETED | 25MB / 300s |
| Health checks | VERIFIED | `/api/health` honest labels |
| Rate limits | VERIFIED | `RateLimitMiddleware` + analyze bucket |
| OpenAPI | COMPLETED | FastAPI auto `/docs` |
| Backend unit/integration tests | VERIFIED | pytest (see TEST_RESULTS.md) |

---

## PHASE 3 — DATABASE [CPU] P0

| Task | Status | Evidence |
|------|--------|----------|
| SQLite works | VERIFIED | Local `voxguard.db` via tests |
| Postgres compatibility | COMPLETED | Dual placeholder wrapper |
| users/sessions | COMPLETED | schema in init_db |
| calls/voice_profiles | COMPLETED | |
| settings/notifications | COMPLETED | |
| api_keys/payment_orders | COMPLETED | |
| Relationships/constraints | COMPLETED | FKs present |
| Indexes | VERIFIED | migration m001 |
| Versioned migrations | VERIFIED | `migrations.py` + schema_migrations |
| Slow/unsafe queries | IN PROGRESS | Indexes added; full EXPLAIN not run |
| Transactions | COMPLETED | commit/rollback wrappers |
| Concurrent updates | BLOCKED | Needs multi-worker Redis for live sessions |
| Safe deletion | COMPLETED | clear helpers + auth gates |
| Biometric protection | IN PROGRESS | revoked_at column; encryption at rest not done |
| Retention policy | COMPLETED | Documented in KNOWN_ISSUES / migrations note |
| Migration rollback tests | NOT STARTED | Forward-only for now |

---

## PHASE 4 — FRONTEND [CPU] P1

| Area | Status | Notes |
|------|--------|-------|
| Live Analysis core | COMPLETED | Upload, mic, scores, spectrogram, AI panel |
| WS live client | COMPLETED | `connectLiveAnalyzeSocket` + mic PCM push |
| Call History | COMPLETED | List/search (pagination optional) |
| Identities | COMPLETED | Enroll UI present |
| Settings/auth/keys | COMPLETED | Pages exist; build verify pending |
| Responsive/a11y | IN PROGRESS | Existing Tailwind layouts |
| Remove dummy data | IN PROGRESS | Soft defaults reduced |
| TS/build | BLOCKED | `echoguard/node_modules` missing; `npm install` required (network approval) |
| Frontend automated tests | NOT STARTED | |

---

## PHASE 5 — AUDIO PIPELINE [CPU] P0

| Task | Status | Evidence |
|------|--------|----------|
| Shared decode/resample/mono/VAD | VERIFIED | `audio_preprocess.py` + tests |
| Silence/corrupt/short handling | VERIFIED | quality + INSUFFICIENT states |
| Sliding windows / buffering | COMPLETED | preprocess + LiveStreamBuffer |
| CPU/GPU shared preprocess | COMPLETED | Same module for both |
| Unit tests | VERIFIED | `test_audio_preprocess.py` |

---

## PHASE 6 — DEEPFAKE INFRA [CPU] P0

| Task | Status | Evidence |
|------|--------|----------|
| AASIST audit | COMPLETED | EXISTING_MODEL_AUDIT |
| Baseline performance | COMPLETED | smoke only; no licensed holdout |
| Model interface | VERIFIED | `detector_interface.py` |
| PyTorch CPU support | COMPLETED | stub + load path; graph not wired |
| Checkpoint loading config | COMPLETED | `VOXGUARD_TORCH_CHECKPOINT` |
| Caching / versioning | COMPLETED | singleton + modelVersion |
| Thresholds / calibration utils | COMPLETED | calibrated_thresholds + score blend |
| Uncertainty states | VERIFIED | detection states |
| Research AASIST/WavLM | COMPLETED | MODEL_COMPARISON.md |
| CPU pretrained neural test | BLOCKED | No vendored AASIST weights (license/download) |
| Comparison scripts | COMPLETED | eval harness + metrics |
| Ensemble interface | COMPLETED | SoftVoting present; neural ensemble GPU |
| Regression tests | VERIFIED | scoring + session tests |

---

## PHASE 7 — DATASET/TRAINING PREP [CPU] P1

| Task | Status | Evidence |
|------|--------|----------|
| Dataset research/licenses | COMPLETED | DATASET_STRATEGY.md |
| Manifests / integrity | COMPLETED | `ml/dataset.py` |
| Splits / leakage controls | COMPLETED | Documented + helpers |
| PyTorch Dataset | IN PROGRESS | Manifest loader ready; full Dataset class thin |
| Augmentation | NOT STARTED | GPU handoff |
| Train scripts + configs | COMPLETED | `ml/train_entrypoint.py`, YAMLs |
| Metrics F1/AUROC/EER/TPR@FPR | VERIFIED | `ml/metrics.py` tests |
| Smoke without full GPU train | COMPLETED | dry-run / skip without data |
| GPU train commands | COMPLETED | gpu-handoff docs |

---

## PHASE 8 — CHATGPT/GEMINI PREP [CPU] P1

| Task | Status | Notes |
|------|--------|-------|
| Benchmark definition | COMPLETED | docs/ai + gpu-handoff |
| Authorized collection methods | COMPLETED | DATASET_STRATEGY |
| Generator labels / codec / VoIP prep | COMPLETED | manifest columns |
| Actual ChatGPT/Gemini metrics | BLOCKED | No authorized samples in repo |
| 95%@1%FPR target | BLOCKED | Aspirational; unmeasured |

---

## PHASE 9 — SPEAKER + NLP [CPU] P1

| Task | Status | Notes |
|------|--------|-------|
| ECAPA audit | COMPLETED | FFT 192-d, not full ECAPA-TDNN |
| Enrollment / similarity | COMPLETED | identities router |
| Pretrained speaker model path | BLOCKED | Requires download approval |
| NLP scam lexicon | COMPLETED | + Indic/Hinglish keywords |
| Negation / FP mitigation | IN PROGRESS | Keyword layer only |
| Separation from AI-voice | VERIFIED | AMVTF semantics |

---

## PHASE 10 — AMVTF [CPU] P0

| Task | Status | Evidence |
|------|--------|----------|
| Fusion audit / separation | VERIFIED | amvtf + tests |
| Insufficient/uncertain gates | VERIFIED | no TERMINATE on silence |
| Temporal aggregation | VERIFIED | live_session |
| Boundary tests | VERIFIED | test_amvtf / test_live_session |

---

## PHASE 11 — REAL-TIME STREAMING [CPU] P0

| Task | Status | Evidence |
|------|--------|----------|
| Audit simulated `/ws/audio-stream` | COMPLETED | Still demo |
| Real `/ws/live-analyze` | VERIFIED | main.py + ws_live.py |
| WS auth | VERIFIED | session token query |
| Browser mic → PCM → WS | COMPLETED | page.tsx + api.ts |
| VAD / buffers / windows | COMPLETED | |
| Session aggregation | VERIFIED | |
| Concurrent session tests | NOT STARTED | |
| VoIP telephony bridge | NOT STARTED | Architecture only |
| First-decision latency measured | COMPLETED | smoke ~11–48 ms chunk |
| GPU substitutable interface | COMPLETED | detector_interface |

---

## PHASE 12 — SECURITY [CPU] P0

| Task | Status | Notes |
|------|--------|-------|
| Demo creds gated | COMPLETED | ALLOW_DEMO_USERS / ENVIRONMENT |
| Backend authz | COMPLETED | Critical routes |
| CORS | COMPLETED | ALLOWED_ORIGINS |
| UTR not sole payment proof | COMPLETED | ALLOW_DEMO_PAYMENTS gate |
| WS secured | COMPLETED | token required |
| Dependency/security scan | NOT STARTED | |
| High-severity residual | IN PROGRESS | See KNOWN_ISSUES |

---

## PHASE 13 — TEST / DEPLOY PREP [CPU] P1/P2

| Task | Status | Notes |
|------|--------|-------|
| Python unit/API tests | VERIFIED | Growing suite |
| Frontend build | NOT STARTED | |
| CI/CD | NOT STARTED | |
| Render/Vercel review | COMPLETED | Prior deploy docs |
| Env var docs | COMPLETED | deploy-voxguard skill / handoff |

---

## PHASE 14 — GPU [RTX 3060]

All items → `REQUIRES GPU` — see `docs/gpu-handoff/` and `GPU_TASKS.md`.

---

## PHASE 15 — FINAL ACCEPTANCE

| Item | Status |
|------|--------|
| Backend starts | VERIFIED (TestClient) |
| Frontend builds | NOT STARTED |
| Auth secure enough for lab | COMPLETED |
| Real inference (sklearn) | VERIFIED |
| Accuracy on ChatGPT/Gemini | BLOCKED |
| Production ready | **NO** — blockers remain |
| GPU tasks identified | COMPLETED |

---

## PHASE 16 — GPU HANDOFF DOCS

| Doc | Status |
|-----|--------|
| docs/gpu-handoff/* | COMPLETED |
| CPU completion / FINAL_HANDOFF | COMPLETED |

---

## Next highest-priority CPU actions

1. Run full pytest and record in TEST_RESULTS.md  
2. `npm run build` in echoguard  
3. Role-based admin guards on destructive routes  
4. Collect authorized eval audio (process, not GPU)  
5. Optional CI workflow YAML  
