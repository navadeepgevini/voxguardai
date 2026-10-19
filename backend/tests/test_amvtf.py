"""Unit tests for AMVTF fusion boundary behavior."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engines.amvtf import amvtf_engine


def test_safe_human_no_target():
    r = amvtf_engine.fuse_signals(
        authenticity=92.0,
        identity=50.0,
        context_risk=5.0,
        target_profile_requested=False,
    )
    assert r["verdict"] == "SAFE"
    assert r["actionType"] == "ALLOW"
    assert 0 <= r["fusedRiskScore"] <= 100


def test_critical_synthetic_voice():
    r = amvtf_engine.fuse_signals(
        authenticity=40.0,
        identity=50.0,
        context_risk=10.0,
        target_profile_requested=False,
    )
    assert r["verdict"] == "CRITICAL"
    assert r["actionType"] == "TERMINATE"


def test_critical_high_context():
    r = amvtf_engine.fuse_signals(
        authenticity=90.0,
        identity=80.0,
        context_risk=75.0,
        target_profile_requested=False,
    )
    assert r["verdict"] == "CRITICAL"
    assert r["actionType"] == "TERMINATE"


def test_warning_elevated_context():
    r = amvtf_engine.fuse_signals(
        authenticity=88.0,
        identity=70.0,
        context_risk=40.0,
        target_profile_requested=False,
    )
    assert r["verdict"] == "WARNING"
    assert r["actionType"] == "STEP_UP"


def test_warning_identity_mismatch_with_target():
    r = amvtf_engine.fuse_signals(
        authenticity=90.0,
        identity=40.0,
        context_risk=5.0,
        matched_profile="",
        is_identity_match=False,
        target_profile_requested=True,
    )
    assert r["verdict"] == "WARNING"
    assert r["actionType"] == "STEP_UP"


def test_fusion_weights_with_target():
    # acoustic=20, id=30, ctx=40 → 0.4*20 + 0.35*30 + 0.25*40 = 8+10.5+10 = 28.5
    r = amvtf_engine.fuse_signals(
        authenticity=80.0,
        identity=70.0,
        context_risk=40.0,
        is_identity_match=True,
        target_profile_requested=True,
    )
    assert r["fusedRiskScore"] == 28.5
    assert r["verdict"] == "WARNING"  # context 40 >= 38
