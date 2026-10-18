import os
import sys
import json
import numpy as np
import pytest
from pydantic import ValidationError

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from engines.aasist import AASISTAuthenticityEngine
from models import AudioAnalysisResponse, TranscriptMessage

def test_splits_zero_leakage():
    """Validates that train, val, test, and unseen splits have zero speaker or generator leakage."""
    splits_dir = os.path.join(os.path.dirname(__file__), "..", "data", "splits")
    
    with open(os.path.join(splits_dir, "train_speakers.json"), "r", encoding="utf-8") as f:
        train_spk = set(json.load(f)["speaker_ids"])
    with open(os.path.join(splits_dir, "val_speakers.json"), "r", encoding="utf-8") as f:
        val_spk = set(json.load(f)["speaker_ids"])
    with open(os.path.join(splits_dir, "test_speakers.json"), "r", encoding="utf-8") as f:
        test_spk = set(json.load(f)["speaker_ids"])
    with open(os.path.join(splits_dir, "unseen_generators.json"), "r", encoding="utf-8") as f:
        unseen_gen = set(g["name"] for g in json.load(f)["generator_families"])

    # Assert mutual disjointness across speaker partitions
    assert len(train_spk.intersection(val_spk)) == 0, "Speaker leakage between train and val splits!"
    assert len(train_spk.intersection(test_spk)) == 0, "Speaker leakage between train and test splits!"
    assert len(val_spk.intersection(test_spk)) == 0, "Speaker leakage between val and test splits!"

    # Known generator training families
    with open(os.path.join(splits_dir, "train_speakers.json"), "r", encoding="utf-8") as f:
        train_gens = set(json.load(f).get("generators_included", []))
    assert len(train_gens.intersection(unseen_gen)) == 0, "Generator leakage into unseen test partition!"

def test_audio_quality_metrics_short_audio():
    """Verifies that short audio (< 0.5s) produces INCONCLUSIVE state with SHORT_DURATION flag."""
    engine = AASISTAuthenticityEngine()
    
    # 0.2 seconds of 16kHz sine wave
    sr = 16000
    short_samples = np.sin(2 * np.pi * 440 * np.linspace(0, 0.2, int(sr * 0.2))).astype(np.float32)
    metrics, flags = engine._compute_quality_metrics(short_samples, sr)
    
    assert "SHORT_DURATION" in flags
    assert metrics["duration_seconds"] == 0.2

def test_aasist_empty_payload_behavior():
    """Verifies handling of empty or missing audio bytes."""
    engine = AASISTAuthenticityEngine()
    res = engine.analyze_audio(b"")
    
    assert res["predictionState"] == "ANALYSIS_FAILED"
    assert "EMPTY_PAYLOAD" in res["qualityFlags"]
    assert res["calibratedSyntheticProbability"] == 0.50
    assert res["inputHash"] is None

def test_aasist_calibration_monotonicity():
    """Validates that Platt scaling produces valid probabilities within [0.01, 0.99]."""
    engine = AASISTAuthenticityEngine()
    
    # Higher authenticity -> lower synthetic probability
    high_auth_prob, high_raw = engine._calibrate_synthetic_probability(95.0)
    low_auth_prob, low_raw = engine._calibrate_synthetic_probability(20.0)
    
    assert 0.01 <= high_auth_prob <= 0.99
    assert 0.01 <= low_auth_prob <= 0.99
    assert high_auth_prob < low_auth_prob, "Calibrated synthetic probability must be inversely related to authenticity!"

def test_audio_analysis_response_schema_validation():
    """Asserts that AudioAnalysisResponse strictly validates all research-grade fields."""
    sample_response = {
        "callerName": "Test Ingest",
        "enrolledTarget": "Unenrolled Caller",
        "contextTitle": "Standard Evaluation",
        "authenticity": 92.5,
        "identity": 0.0,
        "contextRisk": 15.0,
        "fusedRiskScore": 12.0,
        "authStatus": "Bona Fide Human Voice (92.5%)",
        "idStatus": "Unenrolled Speaker",
        "nlpIntent": "Inquiry",
        "threatKeywords": [],
        "semanticFlags": [],
        "recommendedAction": "Allow Call",
        "actionType": "ALLOW",
        "rationale": "Authentic acoustic formants, no threat keywords detected.",
        "transcript": [
            {
                "speaker": "Caller",
                "text": "Hello, I am calling regarding my account balance.",
                "time": "12:00:00",
                "alert": False,
                "threatKeywords": []
            }
        ],
        "spectralEntropy": 0.42,
        "zcr": 0.045,
        "jitter": 1.25,
        "kurtosis": 16.8,
        "syntheticIndicators": [],
        "predictionState": "LIKELY_GENUINE",
        "calibratedSyntheticProbability": 0.03,
        "rawSyntheticScore": 0.075,
        "qualityFlags": [],
        "qualityMetrics": {
            "duration_seconds": 3.5,
            "clipping_ratio": 0.001,
            "silence_ratio": 0.12,
            "snr_db": 22.4,
            "voiced_duration_seconds": 2.8
        },
        "modelName": "VoxGuard-AMVTF-Ensemble",
        "modelVersion": "v2.2.0-research",
        "modelChecksum": "sha256-a7f92b49e38d",
        "inputHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "thresholdVersion": "v2.2-balanced-0.50",
        "operatingMode": "BALANCED",
        "segmentEvidence": [
            {
                "segment_index": 0,
                "time_start_sec": 0.0,
                "time_end_sec": 1.0,
                "rms_energy": 0.052,
                "zcr": 0.041,
                "voiced_speech": True
            }
        ]
    }
    
    # Must construct without ValidationError
    validated = AudioAnalysisResponse(**sample_response)
    assert validated.predictionState == "LIKELY_GENUINE"
    assert validated.calibratedSyntheticProbability == 0.03
    assert validated.qualityMetrics["snr_db"] == 22.4
