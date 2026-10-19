"""Deterministic audio preprocess tests."""
import os
import sys
import struct
import wave
import io
import math

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engines.audio_preprocess import (
    assess_quality,
    decode_audio_bytes,
    frame_energy_vad,
    peak_normalize,
    resample_linear,
    samples_to_wav_bytes,
    sliding_windows,
    validate_upload,
)


def _tone_wav(seconds=1.0, freq=200.0, sr=16000, amp=0.3):
    n = int(seconds * sr)
    samples = [int(amp * 32767 * math.sin(2 * math.pi * freq * i / sr)) for i in range(n)]
    bio = io.BytesIO()
    with wave.open(bio, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(b"".join(struct.pack("<h", s) for s in samples))
    return bio.getvalue()


def test_decode_wav_roundtrip_length():
    raw = _tone_wav(0.5)
    samples, sr = decode_audio_bytes(raw, 16000)
    assert sr == 16000
    assert abs(len(samples) - 8000) < 50


def test_silence_quality():
    samples = np.zeros(16000, dtype=np.float32)
    q = assess_quality(samples, 16000)
    assert q.is_silence
    assert not q.ok


def test_vad_on_tone():
    t = np.sin(2 * np.pi * 180 * np.arange(16000) / 16000).astype(np.float32) * 0.4
    mask, ratio = frame_energy_vad(t, 16000)
    assert ratio > 0.5


def test_validate_upload_too_large():
    ok, reason, _, _ = validate_upload(b"x" * 100, max_bytes=10)
    assert not ok
    assert reason == "file_too_large"


def test_samples_to_wav_and_back():
    t = np.sin(2 * np.pi * 220 * np.arange(1600) / 16000).astype(np.float32) * 0.2
    wav = samples_to_wav_bytes(t, 16000)
    samples, sr = decode_audio_bytes(wav, 16000)
    assert sr == 16000
    assert len(samples) == 1600


def test_sliding_windows():
    x = np.zeros(16000 * 4, dtype=np.float32)
    wins = sliding_windows(x, 16000, window_s=1.8, hop_s=0.9)
    assert len(wins) >= 2


def test_resample_linear():
    x = np.ones(8000, dtype=np.float32)
    y = resample_linear(x, 8000, 16000)
    assert abs(len(y) - 16000) <= 1


def test_peak_normalize():
    x = np.array([0.1, -0.2, 0.05], dtype=np.float32)
    y = peak_normalize(x, 0.95)
    assert abs(float(np.max(np.abs(y))) - 0.95) < 1e-3
