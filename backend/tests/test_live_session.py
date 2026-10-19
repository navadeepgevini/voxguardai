"""Tests for live session aggregator and AMVTF detection-state gates."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engines.live_session import LiveSessionAggregator
from engines.amvtf import amvtf_engine


def test_session_waits_before_three_voiced_seconds():
    agg = LiveSessionAggregator(window_seconds=1.8)
    meta = agg.update("s1", 80.0, True, "LIKELY_AI_GENERATED")
    assert meta["voicedSecondsAccumulated"] < 3.0
    # First window alone should not force WAITING if consecutive_high incomplete
    assert meta["sessionDetectionState"] in ("WAITING_FOR_SPEECH", "UNCERTAIN", "LIKELY_AI_GENERATED")


def test_session_escalates_after_consecutive_high():
    agg = LiveSessionAggregator(window_seconds=1.8, escalate_after=2)
    # EMA starts at 50; need high chunk scores so EMA crosses high_threshold (65)
    agg.update("s2", 85.0, True, "LIKELY_AI_GENERATED")
    meta = agg.update("s2", 88.0, True, "LIKELY_AI_GENERATED")
    assert meta["consecutiveHigh"] >= 2
    assert meta["sessionSyntheticProbability"] >= 65.0
    assert meta["sessionDetectionState"] == "LIKELY_AI_GENERATED"
    assert meta["voicedSecondsAccumulated"] >= 3.0


def test_silence_chunks_do_not_accumulate_voiced():
    agg = LiveSessionAggregator()
    meta = agg.update("s3", 50.0, False, "WAITING_FOR_SPEECH")
    assert meta["voicedSecondsAccumulated"] == 0.0
    assert meta["sessionDetectionState"] in ("WAITING_FOR_SPEECH", "UNCERTAIN")


def test_session_caption_accumulates():
    agg = LiveSessionAggregator()
    agg.update("cap1", 20.0, True, "LIKELY_HUMAN", caption_chunk="hello there")
    meta = agg.update("cap1", 22.0, True, "LIKELY_HUMAN", caption_chunk="how are you")
    assert "hello there" in meta["sessionCaption"]
    assert "how are you" in meta["sessionCaption"]
    # Duplicate should not double
    meta2 = agg.update("cap1", 22.0, True, "LIKELY_HUMAN", caption_chunk="hello there")
    assert meta2["sessionCaption"].lower().count("hello there") == 1


def test_amvtf_insufficient_audio_does_not_terminate():
    r = amvtf_engine.fuse_signals(
        authenticity=50.0,
        identity=50.0,
        context_risk=5.0,
        detection_state="INSUFFICIENT_AUDIO",
        synthetic_probability=50.0,
    )
    assert r["actionType"] != "TERMINATE"
    assert r["verdict"] in ("SAFE", "WARNING")


def test_amvtf_uncertain_ai_is_step_up_not_terminate():
    r = amvtf_engine.fuse_signals(
        authenticity=55.0,
        identity=50.0,
        context_risk=10.0,
        detection_state="UNCERTAIN",
        synthetic_probability=62.0,
    )
    assert r["verdict"] == "WARNING"
    assert r["actionType"] == "STEP_UP"


def test_amvtf_likely_ai_terminates():
    r = amvtf_engine.fuse_signals(
        authenticity=35.0,
        identity=50.0,
        context_risk=10.0,
        detection_state="LIKELY_AI_GENERATED",
        synthetic_probability=78.0,
    )
    assert r["verdict"] == "CRITICAL"
    assert r["actionType"] == "TERMINATE"


def test_amvtf_high_context_still_critical_for_human_voice():
    r = amvtf_engine.fuse_signals(
        authenticity=92.0,
        identity=80.0,
        context_risk=75.0,
        detection_state="LIKELY_HUMAN",
        synthetic_probability=12.0,
    )
    assert r["verdict"] == "CRITICAL"
    assert r["actionType"] == "TERMINATE"
