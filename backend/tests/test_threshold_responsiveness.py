import numpy as np
import pytest
from engines.aasist import aasist_engine
from engines.ecapa import ecapa_engine
from engines.nlp import nlp_engine
from engines.amvtf import amvtf_engine

def test_aasist_threshold_responsiveness():
    """Verify that AASIST threshold dynamically modulates predictionState and status."""
    # Synthetic / border audio bytes test with synthetic tone
    sr = 16000
    t = np.linspace(0, 1.0, sr, endpoint=False)
    # Monotonic 440 Hz tone (classic TTS robotic pitch rigidity)
    tone = (0.5 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)
    import io, soundfile as sf
    buf = io.BytesIO()
    sf.write(buf, tone, sr, format="WAV")
    audio_bytes = buf.getvalue()

    # Under relaxed threshold (e.g. 15%)
    res_relaxed = aasist_engine.analyze_audio(audio_bytes, threshold=15.0)
    # Under strict threshold (e.g. 95%)
    res_strict = aasist_engine.analyze_audio(audio_bytes, threshold=95.0)

    assert res_relaxed["operatingMode"] == "LOW_FALSE_POSITIVE"
    assert res_strict["operatingMode"] == "HIGH_RECALL_SECURITY"
    assert "tau0.85" in res_relaxed["thresholdVersion"] or "tau0.05" in res_strict["thresholdVersion"]

def test_ecapa_threshold_responsiveness():
    """Verify that ECAPA speaker verification threshold changes match determination."""
    # Test verify_speaker with explicit threshold override
    sr = 16000
    noise = np.random.normal(0, 0.1, sr).astype(np.float32)
    import io, soundfile as sf
    buf = io.BytesIO()
    sf.write(buf, noise, sr, format="WAV")
    audio_bytes = buf.getvalue()

    res_strict = ecapa_engine.verify_speaker(audio_bytes, threshold=95.0)
    res_loose = ecapa_engine.verify_speaker(audio_bytes, threshold=5.0)

    # Similarity should be compared against the respective threshold
    assert "95.0%" in res_strict["idStatus"] or "95%" in res_strict["idStatus"]
    assert "5.0%" in res_loose["idStatus"] or "5%" in res_loose["idStatus"]

def test_nlp_sensitivity_responsiveness():
    """Verify that NLP sensitivity scales threat scores and intent classifications."""
    scam_text = "urgent transfer money to safe account immediately"
    
    res_low = nlp_engine.analyze_text(scam_text, sensitivity=20.0)
    res_high = nlp_engine.analyze_text(scam_text, sensitivity=95.0)

    assert res_high["contextRisk"] > res_low["contextRisk"]
    assert res_low["effectiveSensitivity"] == 20.0
    assert res_high["effectiveSensitivity"] == 95.0

def test_amvtf_dynamic_fusion():
    """Verify that AMVTF fusion reacts differently to custom thresholds for identical input scores."""
    # Sample scores: Authenticity=60%, Identity=45%, ContextRisk=40%
    # Under baseline defaults (AASIST=50%, ECAPA=70%, NLP=65%)
    # Authenticity (60) >= 50 -> genuine voice, but identity is unverified
    res_default = amvtf_engine.fuse_signals(
        authenticity=60.0,
        identity=45.0,
        context_risk=40.0,
        matched_profile="Unknown",
        is_identity_match=False,
        aasist_threshold=50.0,
        ecapa_threshold=70.0,
        nlp_sensitivity=65.0
    )

    # Under strict security (AASIST=95%, ECAPA=70%, NLP=65%)
    # Authenticity (60) < 95 -> FLAGGED as deepfake/sub-threshold!
    res_strict = amvtf_engine.fuse_signals(
        authenticity=60.0,
        identity=45.0,
        context_risk=40.0,
        matched_profile="Unknown",
        is_identity_match=False,
        aasist_threshold=95.0,
        ecapa_threshold=70.0,
        nlp_sensitivity=65.0
    )

    # Strict threshold must penalize the fused risk score more severely
    assert res_strict["fusedRiskScore"] > res_default["fusedRiskScore"]
    assert res_strict["actionType"] in ["TERMINATE", "STEP_UP"]
    assert "95%" in res_strict["rationale"] or "threshold" in res_strict["rationale"].lower()
