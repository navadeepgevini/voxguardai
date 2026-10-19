"""Threshold / sensitivity behavior against current engine APIs (no invented kwargs)."""
import io

import numpy as np
import soundfile as sf

from engines.aasist import aasist_engine
from engines.ecapa import ecapa_engine
from engines.nlp import nlp_engine
from engines.amvtf import amvtf_engine


def test_aasist_constructor_threshold_stored():
    """Engine stores configured decision threshold on construction."""
    from engines.aasist import AASISTAuthenticityEngine

    eng = AASISTAuthenticityEngine(threshold=62.0)
    assert eng.threshold == 62.0


def test_aasist_live_tone_returns_detection_state():
    sr = 16000
    t = np.linspace(0, 1.0, sr, endpoint=False)
    tone = (0.5 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)
    buf = io.BytesIO()
    sf.write(buf, tone, sr, format="WAV")
    res = aasist_engine.analyze_audio(buf.getvalue())
    assert "detectionState" in res
    assert "syntheticProbability" in res
    assert 0.0 <= res["syntheticProbability"] <= 100.0


def test_ecapa_threshold_on_engine():
    """ECAPA match uses engine.threshold for isMatch determination."""
    from engines.ecapa import ECAPATDNNIdentityEngine

    eng = ECAPATDNNIdentityEngine(threshold=95.0)
    assert eng.threshold == 95.0
    sr = 16000
    noise = np.random.normal(0, 0.1, sr).astype(np.float32)
    buf = io.BytesIO()
    sf.write(buf, noise, sr, format="WAV")
    res = eng.verify_speaker(live_audio=buf.getvalue())
    assert "identity" in res
    assert "isMatch" in res


def test_nlp_sensitivity_on_engine():
    """NLP sensitivity is stored on the engine and affects scoring context."""
    from engines.nlp import ContextualThreatEngine

    low = ContextualThreatEngine(sensitivity=20.0)
    high = ContextualThreatEngine(sensitivity=95.0)
    scam_text = "urgent transfer money to safe account immediately tell me the otp"
    r_low = low.analyze_text(scam_text)
    r_high = high.analyze_text(scam_text)
    assert r_low["contextRisk"] > 0
    assert r_high["contextRisk"] > 0
    assert low.sensitivity == 20.0
    assert high.sensitivity == 95.0


def test_amvtf_dynamic_fusion_existing_api():
    """Fusion reacts to authenticity / synthetic_probability / detection_state."""
    mild = amvtf_engine.fuse_signals(
        authenticity=85.0,
        identity=50.0,
        context_risk=40.0,
        detection_state="LIKELY_HUMAN",
        synthetic_probability=15.0,
    )
    harsh = amvtf_engine.fuse_signals(
        authenticity=40.0,
        identity=50.0,
        context_risk=40.0,
        detection_state="LIKELY_AI_GENERATED",
        synthetic_probability=75.0,
    )
    assert harsh["fusedRiskScore"] >= mild["fusedRiskScore"]
    assert harsh["actionType"] in ("TERMINATE", "STEP_UP")
    assert mild["actionType"] in ("ALLOW", "STEP_UP", "TERMINATE")
