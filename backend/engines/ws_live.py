"""
Real WebSocket live authenticity inference helpers.

Binary protocol (preferred):
  Client sends raw PCM16 LE mono @ 16 kHz frames (or WAV bytes).
  Server accumulates ~1.8 s, runs detector, returns JSON.

Text protocol:
  {"type":"pcm16_b64","data":"<base64>","session_id":"..."}
  {"type":"end"}
"""
from __future__ import annotations

import base64
import time
from typing import Any, Dict, Optional

import numpy as np

from engines.audio_preprocess import assess_quality, decode_audio_bytes, samples_to_wav_bytes
from engines.detector_interface import get_detector
from engines.live_session import live_session_aggregator


class LiveStreamBuffer:
    def __init__(self, sr: int = 16000, window_seconds: float = 1.8):
        self.sr = sr
        self.window_samples = int(window_seconds * sr)
        self.buf = np.array([], dtype=np.float32)

    def push_pcm16(self, raw: bytes) -> Optional[np.ndarray]:
        if len(raw) < 2:
            return None
        raw = raw[: len(raw) - (len(raw) % 2)]
        chunk = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
        self.buf = np.concatenate([self.buf, chunk])
        if len(self.buf) >= self.window_samples:
            window = self.buf[: self.window_samples].copy()
            # 50% overlap keep
            keep = self.window_samples // 2
            self.buf = self.buf[keep:]
            return window
        return None

    def push_bytes(self, data: bytes) -> Optional[np.ndarray]:
        # Try decode as container; else treat as PCM16
        samples, _ = decode_audio_bytes(data, self.sr)
        if len(samples) == 0 and len(data) >= 2:
            return self.push_pcm16(data)
        self.buf = np.concatenate([self.buf, samples])
        if len(self.buf) >= self.window_samples:
            window = self.buf[: self.window_samples].copy()
            keep = self.window_samples // 2
            self.buf = self.buf[keep:]
            return window
        return None


def analyze_window(
    samples: np.ndarray,
    session_id: str,
    sr: int = 16000,
) -> Dict[str, Any]:
    q = assess_quality(samples, sr)
    detector = get_detector()
    wav = samples_to_wav_bytes(samples, sr)
    t0 = time.perf_counter()
    try:
        result = detector.predict_bytes(wav, mode="live")
        det = result.to_dict()
    except Exception as e:
        # Fallback to sklearn engine path via factory
        from engines.aasist import aasist_engine

        out = aasist_engine.analyze_live_chunk(wav)
        det = {
            "synthetic_probability": out.get("syntheticProbability", 50.0),
            "authenticity": out.get("authenticity", 50.0),
            "detection_state": out.get("detectionState", "UNCERTAIN"),
            "uncertainty": out.get("uncertainty", 0.5),
            "model_id": "aasist_sklearn_fallback",
            "model_version": out.get("modelVersion"),
            "backend": "sklearn_joblib",
            "device": "cpu",
            "latency_ms": round((time.perf_counter() - t0) * 1000, 2),
            "voiced": out.get("voiced", False),
            "quality_ok": q.ok,
            "quality_reason": q.reason or str(e),
            "extras": {},
        }

    session_meta = live_session_aggregator.update(
        session_id=session_id,
        synthetic_probability=float(det["synthetic_probability"]),
        voiced=bool(det.get("voiced")) and q.ok and not q.is_silence,
        detection_state=str(det["detection_state"]),
    )

    return {
        "type": "LIVE_INFERENCE",
        "mode": "real_amvtf_authenticity",
        "rms": round(q.rms, 5),
        "voicedRatio": round(q.voiced_ratio, 3),
        "qualityOk": q.ok,
        "qualityReason": q.reason,
        "authenticity": det["authenticity"],
        "syntheticProbability": det["synthetic_probability"],
        "detectionState": det["detection_state"],
        "uncertainty": det["uncertainty"],
        "modelId": det["model_id"],
        "modelVersion": det["model_version"],
        "backend": det["backend"],
        "device": det["device"],
        "latencyMs": det["latency_ms"],
        "sessionId": session_meta["sessionId"],
        "sessionSyntheticProbability": session_meta["sessionSyntheticProbability"],
        "sessionDetectionState": session_meta["sessionDetectionState"],
        "voicedSecondsAccumulated": session_meta["voicedSecondsAccumulated"],
    }


def decode_text_message(msg: str) -> Dict[str, Any]:
    import json

    return json.loads(msg)


def pcm_from_b64(data_b64: str) -> bytes:
    return base64.b64decode(data_b64)
