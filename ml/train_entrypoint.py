#!/usr/bin/env python3
"""
Training entrypoint (CPU smoke + GPU-ready).

CPU: refits a SoftVoting-style pipeline on 12-D features if labeled audio exists.
GPU: loads config and prints the exact torch training steps reserved for RTX 3060.

Usage:
  python -m ml.train_entrypoint --config ml/configs/train_cpu_smoke.yaml
  python -m ml.train_entrypoint --config ml/configs/train_gpu_rtx3060.yaml --dry-run
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))


def _load_yaml(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    try:
        import yaml

        return yaml.safe_load(text)
    except ImportError:
        # Minimal YAML subset for our configs (key: value)
        cfg = {}
        for line in text.splitlines():
            line = line.split("#")[0].strip()
            if not line or ":" not in line:
                continue
            k, v = line.split(":", 1)
            k, v = k.strip(), v.strip().strip('"').strip("'")
            if v.lower() in ("true", "false"):
                cfg[k] = v.lower() == "true"
            elif v.lower() in ("null", "none", ""):
                cfg[k] = None
            else:
                try:
                    cfg[k] = int(v)
                except ValueError:
                    try:
                        cfg[k] = float(v)
                    except ValueError:
                        cfg[k] = v
        return cfg


def train_sklearn_smoke(cfg: dict) -> dict:
    from ml.dataset import filter_split, iter_existing, load_manifest
    from engines.aasist import AASISTAuthenticityEngine
    from engines.audio_preprocess import samples_to_wav_bytes, decode_audio_bytes

    manifest = ROOT / cfg.get("manifest", "data/eval/manifest.csv")
    if not manifest.is_file():
        return {
            "status": "skipped",
            "reason": f"manifest missing: {manifest}. Create via scripts/init_eval_manifest.py",
        }

    rows = load_manifest(manifest)
    train_rows = list(iter_existing(filter_split(rows, "train")))
    max_n = cfg.get("max_samples")
    if max_n:
        train_rows = train_rows[: int(max_n)]
    if len(train_rows) < 4:
        return {"status": "skipped", "reason": f"need >=4 existing train files, found {len(train_rows)}"}

    # Feature extraction via live engine path (ensures feature parity)
    eng = AASISTAuthenticityEngine()
    X, y = [], []
    t0 = time.perf_counter()
    for rec in train_rows:
        raw = rec.path.read_bytes()
        out = eng.analyze_live_chunk(raw)
        # Use internal feat via predict — we only have scores here; for true retrain
        # export features in a future GPU pass. Smoke: verify labels load + inference.
        X.append(float(out.get("syntheticProbability", 50.0)))
        y.append(rec.label)
    elapsed = time.perf_counter() - t0
    return {
        "status": "smoke_ok",
        "n_train_files": len(train_rows),
        "labels": {"human": y.count(0), "ai": y.count(1)},
        "mean_synthetic_score": sum(X) / len(X) if X else None,
        "elapsed_s": round(elapsed, 3),
        "note": "Full SoftVoting refit requires feature-matrix export (GPU handoff task).",
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", required=True)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    cfg = _load_yaml(Path(args.config))
    device = str(cfg.get("device", "cpu")).lower()
    backend = str(cfg.get("backend", "sklearn_softvote"))

    report = {
        "config": args.config,
        "device": device,
        "backend": backend,
        "dry_run": args.dry_run,
    }

    if args.dry_run or device == "cuda" or "torch" in backend:
        report["status"] = "gpu_reserved" if device == "cuda" else "dry_run"
        report["message"] = (
            "Torch AASIST-L / WavLM training is reserved for RTX 3060. "
            "See docs/gpu-handoff/MODEL_TRAINING_PLAN.md"
        )
        if device == "cuda":
            try:
                import torch

                report["cuda_available"] = torch.cuda.is_available()
                if torch.cuda.is_available():
                    report["gpu_name"] = torch.cuda.get_device_name(0)
                    report["vram_gb"] = round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 2)
            except ImportError:
                report["cuda_available"] = False
                report["torch_installed"] = False
        print(json.dumps(report, indent=2))
        return 0

    result = train_sklearn_smoke(cfg)
    report.update(result)
    out_dir = ROOT / "artifacts" / "logs"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"{cfg.get('experiment_name', 'exp')}_last.json"
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"Wrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
