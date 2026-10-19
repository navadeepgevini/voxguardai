"""NLP fraud keyword coverage smoke tests."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engines.nlp import nlp_engine


def test_otp_english_high_risk():
    r = nlp_engine.analyze_text("Please tell me the OTP sent to your phone right now")
    assert r["contextRisk"] >= 38
    assert any("otp" in k.lower() for k in r.get("threatKeywords", []))


def test_indic_upi_phrase():
    r = nlp_engine.analyze_text("bhai otp batao aur upi pin share karo")
    assert r["contextRisk"] > 0
    assert len(r.get("threatKeywords", [])) >= 1


def test_benign_inquiry_low():
    r = nlp_engine.analyze_text("Hello, I want to know my account balance please")
    assert r["contextRisk"] < 70
