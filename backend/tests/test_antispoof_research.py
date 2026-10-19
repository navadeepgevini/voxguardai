"""Research-oriented authenticity tests aligned to the current engine (detectionState API)."""
import os
import sys
import json
import io
import struct
import wave

import numpy as np
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from engines.aasist import AASISTAuthenticityEngine
from engines.audio_preprocess import assess_quality
from models import AudioAnalysisResponse


def _tone_wav(seconds=1.0, freq=440.0, sr=16000, amp=0.3) -> bytes:
    n = int(seconds * sr)
    samples = [int(amp * 32767 * np.sin(2 * np.pi * freq * i / sr)) for i in range(n)]
    bio = io.BytesIO()
    with wave.open(bio, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(b"".join(struct.pack("<h", s) for s in samples))
    return bio.getvalue()


def test_splits_zero_leakage():
    """Validates train/val/test/unseen speaker+generator disjointness when split files exist."""
    splits_dir = os.path.join(os.path.dirname(__file__), "..", "data", "splits")
    if not os.path.isdir(splits_dir):
        pytest.skip("data/splits not present")

    with open(os.path.join(splits_dir, "train_speakers.json"), "r", encoding="utf-8") as f:
        train_spk = set(json.load(f)["speaker_ids"])
    with open(os.path.join(splits_dir, "val_speakers.json"), "r", encoding="utf-8") as f:
        val_spk = set(json.load(f)["speaker_ids"])
    with open(os.path.join(splits_dir, "test_speakers.json"), "r", encoding="utf-8") as f:
        test_spk = set(json.load(f)["speaker_ids"])
    with open(os.path.join(splits_dir, "unseen_generators.json"), "r", encoding="utf-8") as f:
        unseen_gen = set(g["name"] for g in json.load(f)["generator_families"])

    assert len(train_spk.intersection(val_spk)) == 0
    assert len(train_spk.intersection(test_spk)) == 0
    assert len(val_spk.intersection(test_spk)) == 0

    with open(os.path.join(splits_dir, "train_speakers.json"), "r", encoding="utf-8") as f:
        train_gens = set(json.load(f).get("generators_included", []))
    assert len(train_gens.intersection(unseen_gen)) == 0


def test_audio_quality_metrics_short_audio():
    """Short audio is flagged by shared preprocess quality assessor."""
    sr = 16000
    short_samples = np.sin(2 * np.pi * 440 * np.linspace(0, 0.2, int(sr * 0.2), endpoint=False)).astype(
        np.float32
    )
    q = assess_quality(short_samples, sr)
    assert q.duration_s == pytest.approx(0.2, abs=0.02)
    assert q.ok is False or q.reason in ("too_short", "silence_or_near_silence", "clipped_but_usable")


def test_aasist_empty_payload_behavior():
    """Empty payload returns insufficient state — not falsely HUMAN or AI."""
    engine = AASISTAuthenticityEngine()
    res = engine.analyze_audio(b"")
    assert res["detectionState"] == "INSUFFICIENT_AUDIO"
    assert float(res["authenticity"]) <= 55.0
    assert res.get("isSynthetic") is False


def test_aasist_score_blend_bounds():
    """Synthetic probability from threat+ML blend stays in [0, 100]."""
    engine = AASISTAuthenticityEngine()
    low = engine._score_from_threat(0.0, 0.1, voiced=True, voiced_frame_count=8, mode="upload")
    high = engine._score_from_threat(80.0, 0.95, voiced=True, voiced_frame_count=8, mode="upload")
    assert 0.0 <= low["syntheticProbability"] <= 100.0
    assert 0.0 <= high["syntheticProbability"] <= 100.0
    assert high["syntheticProbability"] >= low["syntheticProbability"]
    assert high["detectionState"] == "LIKELY_AI_GENERATED"


def test_audio_analysis_response_schema_validation():
    """AudioAnalysisResponse accepts current SOC fields (detectionState API)."""
    sample_response = {
        "callerName": "Test Ingest",
        "enrolledTarget": "Unenrolled Caller",
        "contextTitle": "Standard Evaluation",
        "authenticity": 92.5,
        "identity": 0.0,
        "contextRisk": 15.0,
        "fusedRiskScore": 12.0,
        "authStatus": "LIKELY HUMAN (92.5% authenticity)",
        "idStatus": "Unenrolled Speaker",
        "nlpIntent": "Inquiry",
        "threatKeywords": [],
        "semanticFlags": [],
        "recommendedAction": "Allow Session — Normal Operations",
        "actionType": "ALLOW",
        "rationale": "Authentic acoustic formants, no threat keywords detected.",
        "transcript": [
            {
                "speaker": "Caller",
                "text": "Hello, I am calling regarding my account balance.",
                "time": "12:00:00",
                "alert": False,
                "threatKeywords": [],
            }
        ],
        "spectralEntropy": 0.42,
        "zcr": 0.045,
        "jitter": 1.25,
        "kurtosis": 16.8,
        "syntheticIndicators": [],
        "detectionState": "LIKELY_HUMAN",
        "syntheticProbability": 8.0,
        "modelVersion": "sklearn-softvote",
    }
    validated = AudioAnalysisResponse(**sample_response)
    assert validated.detectionState == "LIKELY_HUMAN"
    assert validated.syntheticProbability == 8.0


def test_analyze_live_chunk_schema_and_detection():
    """Live chunk returns detectionState fields; silence is not labeled SAFE human."""
    engine = AASISTAuthenticityEngine()

    res_empty = engine.analyze_live_chunk(b"")
    assert "detectionState" in res_empty
    assert res_empty["detectionState"] in (
        "WAITING_FOR_SPEECH",
        "INSUFFICIENT_AUDIO",
        "UNCERTAIN",
    )
    assert "syntheticProbability" in res_empty

    wav = _tone_wav(1.5, 200.0)
    res_live = engine.analyze_live_chunk(wav)
    assert "detectionState" in res_live
    assert "syntheticProbability" in res_live
    assert res_live["detectionState"] in (
        "LIKELY_AI_GENERATED",
        "UNCERTAIN",
        "LIKELY_HUMAN",
        "INSUFFICIENT_AUDIO",
        "WAITING_FOR_SPEECH",
    )
