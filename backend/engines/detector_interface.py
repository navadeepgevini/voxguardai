"""
Modular authenticity detector interface.

Backends:
  - sklearn_joblib (current production path via AASISTAuthenticityEngine)
  - torch_checkpoint (GPU/CPU PyTorch — stub until weights registered)
  - heuristic_only (no joblib)

Device selection: cpu | cuda | auto
"""
from __future__ import annotations

import os
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict
from typing import Any, Dict, Optional

import numpy as np

from engines.audio_preprocess import (
    assess_quality,
    decode_audio_bytes,
    samples_to_wav_bytes,
)


@dataclass
class DetectorResult:
    synthetic_probability: float
    authenticity: float
    detection_state: str
    uncertainty: float
    model_id: str
    model_version: str
    backend: str
    device: str
    latency_ms: float
    voiced: bool
    quality_ok: bool
    quality_reason: str
    extras: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        return d


class AuthenticityDetector(ABC):
    @abstractmethod
    def predict_bytes(self, audio_data: bytes, mode: str = "live") -> DetectorResult:
        ...

    @abstractmethod
    def predict_samples(self, samples: np.ndarray, sr: int = 16000, mode: str = "live") -> DetectorResult:
        ...

    @property
    @abstractmethod
    def model_id(self) -> str:
        ...

    @property
    @abstractmethod
    def device(self) -> str:
        ...


class SklearnAasistDetector(AuthenticityDetector):
    """Wraps existing AASISTAuthenticityEngine (heuristics ± SoftVoting joblib)."""

    def __init__(self):
        from engines.aasist import aasist_engine

        self._engine = aasist_engine

    @property
    def model_id(self) -> str:
        return "aasist_sklearn"

    @property
    def device(self) -> str:
        return "cpu"

    def predict_bytes(self, audio_data: bytes, mode: str = "live") -> DetectorResult:
        t0 = time.perf_counter()
        samples, sr = decode_audio_bytes(audio_data)
        q = assess_quality(samples, sr)
        if mode == "live":
            out = self._engine.analyze_live_chunk(audio_data)
        else:
            out = self._engine.analyze_audio(audio_data)
        ms = (time.perf_counter() - t0) * 1000.0
        return DetectorResult(
            synthetic_probability=float(out.get("syntheticProbability", 50.0)),
            authenticity=float(out.get("authenticity", 50.0)),
            detection_state=str(out.get("detectionState", "UNCERTAIN")),
            uncertainty=float(out.get("uncertainty", 0.5)),
            model_id=self.model_id,
            model_version=str(out.get("modelVersion", self._engine.model_version)),
            backend="sklearn_joblib",
            device=self.device,
            latency_ms=round(ms, 2),
            voiced=bool(out.get("voiced", q.voiced_ratio > 0.1)),
            quality_ok=q.ok,
            quality_reason=q.reason,
            extras={
                "mlConfidence": out.get("mlConfidence"),
                "syntheticIndicators": out.get("syntheticIndicators", []),
                "authStatus": out.get("authStatus"),
            },
        )

    def predict_samples(self, samples: np.ndarray, sr: int = 16000, mode: str = "live") -> DetectorResult:
        wav = samples_to_wav_bytes(samples, sr)
        return self.predict_bytes(wav, mode=mode)


class TorchCheckpointDetector(AuthenticityDetector):
    """
    Placeholder for AASIST / WavLM / wav2vec heads.

    Loads only when VOXGUARD_TORCH_CHECKPOINT is set and torch is installed.
    On CPU laptop without weights → raises RuntimeError (caller should fallback).
    """

    def __init__(self, checkpoint_path: Optional[str] = None, device: str = "auto"):
        self.checkpoint_path = checkpoint_path or os.environ.get("VOXGUARD_TORCH_CHECKPOINT", "")
        self._device = self._resolve_device(device)
        self._model = None
        self._version = "torch-unloaded"
        if self.checkpoint_path and os.path.isfile(self.checkpoint_path):
            self._try_load()

    def _resolve_device(self, device: str) -> str:
        if device == "cpu":
            return "cpu"
        try:
            import torch

            if device in ("cuda", "auto") and torch.cuda.is_available():
                return "cuda"
        except ImportError:
            pass
        return "cpu"

    def _try_load(self) -> None:
        try:
            import torch

            # Expected: {"state_dict": ..., "model_type": "aasist_l"|"wavlm_head", "version": "..."}
            # Full architecture wiring is GPU-handoff work; here we only validate file loadability.
            obj = torch.load(self.checkpoint_path, map_location=self._device, weights_only=False)
            self._model = obj
            if isinstance(obj, dict):
                self._version = str(obj.get("version", "torch-checkpoint"))
            else:
                self._version = "torch-raw"
        except Exception as e:
            raise RuntimeError(f"Failed to load torch checkpoint: {e}") from e

    @property
    def model_id(self) -> str:
        return "torch_checkpoint"

    @property
    def device(self) -> str:
        return self._device

    def predict_bytes(self, audio_data: bytes, mode: str = "live") -> DetectorResult:
        if self._model is None:
            raise RuntimeError(
                "Torch checkpoint not loaded. Set VOXGUARD_TORCH_CHECKPOINT after GPU training."
            )
        # Until architecture code is wired, refuse silent fake scores
        raise RuntimeError(
            "Torch inference graph not wired on this build. Use SklearnAasistDetector or complete "
            "GPU handoff MODEL_TRAINING_PLAN integration."
        )

    def predict_samples(self, samples: np.ndarray, sr: int = 16000, mode: str = "live") -> DetectorResult:
        return self.predict_bytes(samples_to_wav_bytes(samples, sr), mode=mode)


def create_detector(backend: Optional[str] = None) -> AuthenticityDetector:
    """
    Factory. Env VOXGUARD_DETECTOR_BACKEND: sklearn | torch | auto
    auto → torch if checkpoint exists and loads, else sklearn.
    """
    backend = (backend or os.environ.get("VOXGUARD_DETECTOR_BACKEND", "sklearn")).strip().lower()
    if backend == "torch":
        return TorchCheckpointDetector()
    if backend == "auto":
        ckpt = os.environ.get("VOXGUARD_TORCH_CHECKPOINT", "")
        if ckpt and os.path.isfile(ckpt):
            try:
                return TorchCheckpointDetector(ckpt)
            except Exception:
                pass
        return SklearnAasistDetector()
    return SklearnAasistDetector()


# Process-wide singleton for HTTP/WS reuse
_detector: Optional[AuthenticityDetector] = None


def get_detector() -> AuthenticityDetector:
    global _detector
    if _detector is None:
        _detector = create_detector()
    return _detector
