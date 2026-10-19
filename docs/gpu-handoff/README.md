# RTX 3060 GPU Handoff — VoxGuard

This package prepares **Laptop 2 (RTX 3060 6 GB)** to continue neural authenticity work without redoing app engineering.

## What Laptop 1 already completed

- FastAPI + EchoGuard SOC flows (analyze, live HTTP, identities, calls, auth gates)
- sklearn SoftVoting authenticity path + session EMA + detection states
- Real WebSocket `/ws/live-analyze`
- Shared `audio_preprocess` + `detector_interface` (torch stub ready)
- `ml/` metrics, dataset manifests, train configs
- Docs under `docs/ai/` and `docs/engineering/`

## Start on Laptop 2

1. Copy/clone this repo (no secrets, no private audio).
2. Follow `GPU_SETUP.md`.
3. Run `python scripts/detect_hardware.py` — confirm CUDA.
4. Place authorized eval/train audio; fill `data/eval/manifest.csv`.
5. Follow `MODEL_TRAINING_PLAN.md` then `BENCHMARK_PLAN.md`.
6. Check off `HANDOFF_CHECKLIST.md`.

## Exact first commands

```bat
cd C:\voxguardai
python -m venv .venv
.venv\Scripts\activate
pip install -r backend\requirements.txt
pip install torch --index-url https://download.pytorch.org/whl/cu124
python scripts\detect_hardware.py
python -m ml.train_entrypoint --config ml\configs\train_gpu_rtx3060.yaml --dry-run
```

(Adjust CUDA wheel URL to match the installed driver — see GPU_SETUP.md.)
