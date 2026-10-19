#!/usr/bin/env python3
"""
Reproducible authenticity baseline harness.

- Always runs synthetic smoke fixtures (silence / short / tone) to verify pipeline health.
- Optionally evaluates labeled WAVs under --eval-dir (see docs/ai/DATASET_STRATEGY.md).
- Never invents ChatGPT/Gemini metrics when those folders are empty.

Usage:
  python scripts/eval_authenticity_baseline.py
  python scripts/eval_authenticity_baseline.py --eval-dir data/eval
"""
from __future__ import annotations

import argparse
import json
import os
import struct
import sys
import time
import wave
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

from engines.aasist import AASISTAuthenticityEngine  # noqa: E402
from engines.live_session import LiveSessionAggregator  # noqa: E402


def _pcm16_wav_bytes(samples, sample_rate: int = 16000) -> bytes:
    import array

    if hasattr(samples, "tolist"):
        flat = [int(max(-32767, min(32767, x))) for x in samples]
    else:
        flat = list(samples)
    buf = array.array("h", flat)
    bio = __import__("io").BytesIO()
    with wave.open(bio, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(buf.tobytes())
    return bio.getvalue()


def make_silence(seconds: float = 1.8, sr: int = 16000) -> bytes:
    n = int(seconds * sr)
    return _pcm16_wav_bytes([0] * n, sr)


def make_tone(seconds: float = 1.8, freq: float = 180.0, sr: int = 16000, amp: float = 0.25) -> bytes:
    import math

    n = int(seconds * sr)
    samples = [int(amp * 32767 * math.sin(2 * math.pi * freq * i / sr)) for i in range(n)]
    return _pcm16_wav_bytes(samples, sr)


def make_short_burst(sr: int = 16000) -> bytes:
    return make_tone(0.15, 220.0, sr)


def confusion_and_metrics(y_true: List[int], y_pred: List[int]) -> Dict[str, Any]:
    tp = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 1)
    tn = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 0)
    fp = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 1)
    fn = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 0)
    prec = tp / (tp + fp) if (tp + fp) else None
    rec = tp / (tp + fn) if (tp + fn) else None
    fpr = fp / (fp + tn) if (fp + tn) else None
    fnr = fn / (fn + tp) if (fn + tp) else None
    f1 = (2 * prec * rec / (prec + rec)) if prec is not None and rec is not None and (prec + rec) else None
    return {
        "tp": tp,
        "tn": tn,
        "fp": fp,
        "fn": fn,
        "precision": prec,
        "recall": rec,
        "fpr": fpr,
        "fnr": fnr,
        "f1": f1,
        "n": len(y_true),
    }


def label_from_path(path: Path) -> Optional[int]:
    parts = {p.lower() for p in path.parts}
    name = path.name.lower()
    if "human" in parts or name.startswith("human_") or "_human_" in name:
        return 0
    if any(x in parts for x in ("ai", "ai_chatgpt", "ai_gemini", "ai_elevenlabs", "ai_other", "spoof", "synthetic")):
        return 1
    if name.startswith("ai_") or name.startswith("spoof_"):
        return 1
    return None


def generator_from_path(path: Path) -> str:
    for part in path.parts:
        pl = part.lower()
        if pl.startswith("ai_"):
            return pl
        if pl == "human":
            return "human"
    return "unknown"


def collect_eval_wavs(eval_dir: Path) -> List[Tuple[Path, int, str]]:
    out: List[Tuple[Path, int, str]] = []
    if not eval_dir.is_dir():
        return out
    for p in sorted(eval_dir.rglob("*")):
        if p.suffix.lower() not in (".wav", ".flac", ".mp3", ".ogg", ".m4a"):
            continue
        lab = label_from_path(p)
        if lab is None:
            continue
        out.append((p, lab, generator_from_path(p)))
    return out


def run_smoke(engine: AASISTAuthenticityEngine) -> Dict[str, Any]:
    cases = {
        "silence": make_silence(1.8),
        "short": make_short_burst(),
        "tone_180hz": make_tone(1.8, 180.0),
    }
    results = {}
    for name, raw in cases.items():
        t0 = time.perf_counter()
        live = engine.analyze_live_chunk(raw)
        ms = (time.perf_counter() - t0) * 1000.0
        results[name] = {
            "detectionState": live.get("detectionState"),
            "syntheticProbability": live.get("syntheticProbability"),
            "authenticity": live.get("authenticity"),
            "latency_ms": round(ms, 2),
            "modelVersion": live.get("modelVersion"),
        }
    # Session aggregator smoke: silence should not escalate to LIKELY_AI
    agg = LiveSessionAggregator()
    for _ in range(3):
        r = engine.analyze_live_chunk(make_silence(1.8))
        meta = agg.update("smoke", float(r["syntheticProbability"]), bool(r.get("voiced")), str(r["detectionState"]))
    results["session_after_silence"] = meta
    return results


def run_labeled(engine: AASISTAuthenticityEngine, items: List[Tuple[Path, int, str]]) -> Dict[str, Any]:
    y_true: List[int] = []
    y_pred: List[int] = []
    latencies: List[float] = []
    by_gen: Dict[str, Dict[str, List[int]]] = defaultdict(lambda: {"y_true": [], "y_pred": []})

    for path, lab, gen in items:
        raw = path.read_bytes()
        t0 = time.perf_counter()
        # Prefer full-file upload path for longer clips; live path for short chunks
        if len(raw) > 8000:
            out = engine.analyze_audio(raw)
        else:
            out = engine.analyze_live_chunk(raw)
        ms = (time.perf_counter() - t0) * 1000.0
        latencies.append(ms)
        pred = 1 if out.get("detectionState") == "LIKELY_AI_GENERATED" or out.get("isSynthetic") else 0
        # Treat INSUFFICIENT / WAITING as non-AI prediction for hard metrics (conservative FPR)
        if out.get("detectionState") in ("INSUFFICIENT_AUDIO", "WAITING_FOR_SPEECH"):
            pred = 0
        y_true.append(lab)
        y_pred.append(pred)
        by_gen[gen]["y_true"].append(lab)
        by_gen[gen]["y_pred"].append(pred)

    latencies_sorted = sorted(latencies)
    p50 = latencies_sorted[len(latencies_sorted) // 2] if latencies_sorted else None
    p95 = latencies_sorted[int(0.95 * (len(latencies_sorted) - 1))] if latencies_sorted else None

    overall = confusion_and_metrics(y_true, y_pred)
    per_generator = {g: confusion_and_metrics(v["y_true"], v["y_pred"]) for g, v in by_gen.items()}
    return {
        "overall": overall,
        "per_generator": per_generator,
        "latency_ms": {"p50": round(p50, 2) if p50 is not None else None, "p95": round(p95, 2) if p95 is not None else None},
        "n_files": len(items),
        "note": "AUROC/EER/TPR@1%FPR require score distributions + enough samples; omitted when n is small or scores uncalibrated.",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--eval-dir", type=str, default=str(ROOT / "data" / "eval"))
    parser.add_argument("--out", type=str, default=str(ROOT / "docs" / "ai" / "baseline_last_run.json"))
    args = parser.parse_args()

    engine = AASISTAuthenticityEngine()
    report: Dict[str, Any] = {
        "timestamp_unix": time.time(),
        "modelVersion": engine.model_version,
        "trainingDataset": engine.training_info,
        "modelLoaded": bool(engine.trained_classifier is not None),
        "smoke": run_smoke(engine),
        "labeled_eval": None,
        "disclaimer": (
            "Smoke fixtures are not deepfake accuracy. Labeled metrics appear only when "
            "licensed WAVs exist under data/eval. ChatGPT/Gemini rates are absent without authorized samples."
        ),
    }

    items = collect_eval_wavs(Path(args.eval_dir))
    if items:
        report["labeled_eval"] = run_labeled(engine, items)
    else:
        report["labeled_eval"] = {
            "n_files": 0,
            "message": f"No labeled audio under {args.eval_dir}. See docs/ai/DATASET_STRATEGY.md.",
        }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"\nWrote {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
