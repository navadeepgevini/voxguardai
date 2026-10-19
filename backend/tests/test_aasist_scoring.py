"""Unit tests for authenticity scoring helpers (no large audio required)."""
import os
import sys
import math
import struct
import wave
import io

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engines.aasist import AASISTAuthenticityEngine


def _wav_bytes(samples, sr=16000):
    bio = io.BytesIO()
    with wave.open(bio, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        frames = b"".join(struct.pack("<h", int(max(-32767, min(32767, s)))) for s in samples)
        wf.writeframes(frames)
    return bio.getvalue()


def test_score_insufficient_when_unvoiced():
    eng = AASISTAuthenticityEngine()
    scored = eng._score_from_threat(0.0, 0.2, voiced=False, voiced_frame_count=0, mode="live")
    assert scored["detectionState"] == "INSUFFICIENT_AUDIO"
    assert scored["authenticity"] == 50.0


def test_score_likely_ai_from_high_ml_blend():
    eng = AASISTAuthenticityEngine()
    # Force high ml_prob path via threat blend
    scored = eng._score_from_threat(40.0, 0.85, voiced=True, voiced_frame_count=10, mode="live")
    assert scored["detectionState"] == "LIKELY_AI_GENERATED"
    assert scored["isSynthetic"] is True
    assert scored["syntheticProbability"] >= 65.0


def test_score_uncertain_band():
    eng = AASISTAuthenticityEngine()
    # Low threat, mid ML → uncertain band when classifier present; without classifier threat maps lower
    scored = eng._score_from_threat(10.0, 0.50, voiced=True, voiced_frame_count=8, mode="live")
    assert scored["detectionState"] in ("UNCERTAIN", "LIKELY_HUMAN", "LIKELY_AI_GENERATED")


def test_silence_live_not_safe_human():
    eng = AASISTAuthenticityEngine()
    silence = _wav_bytes([0] * 16000 * 2)
    out = eng.analyze_live_chunk(silence)
    assert out["detectionState"] in ("INSUFFICIENT_AUDIO", "WAITING_FOR_SPEECH")
    assert out["authenticity"] <= 55.0  # must not claim ~92 SAFE human


def test_calibrated_thresholds_loaded():
    eng = AASISTAuthenticityEngine()
    assert "jitter_min" in eng.calibrated_thresholds
    assert eng.calibrated_thresholds["jitter_min"] > 0
