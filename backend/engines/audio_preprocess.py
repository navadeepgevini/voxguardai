"""
Shared audio preprocessing for upload, live mic, WebSocket, training, and benchmarks.

All paths should decode to float32 mono @ target_sr (default 16 kHz).
"""
from __future__ import annotations

import io
import struct
import wave
from dataclasses import dataclass
from typing import Optional, Tuple

import numpy as np

try:
    import av
except ImportError:
    av = None

try:
    import soundfile as sf
except ImportError:
    sf = None


@dataclass
class AudioQuality:
    duration_s: float
    sample_rate: int
    rms: float
    peak: float
    voiced_ratio: float
    is_silence: bool
    is_clipped: bool
    ok: bool
    reason: str = ""


def decode_audio_bytes(
    audio_data: bytes,
    target_sr: int = 16000,
) -> Tuple[np.ndarray, int]:
    """Decode arbitrary container/codec bytes → float32 mono @ target_sr."""
    if not audio_data or len(audio_data) < 16:
        return np.array([], dtype=np.float32), target_sr

    # 1. PyAV
    if av is not None:
        try:
            container = av.open(io.BytesIO(audio_data))
            audio_stream = next((s for s in container.streams if s.type == "audio"), None)
            if audio_stream:
                resampler = av.AudioResampler(format="fltp", layout="mono", rate=target_sr)
                chunks = []
                for frame in container.decode(audio_stream):
                    for rf in resampler.resample(frame):
                        chunks.append(rf.to_ndarray()[0])
                if chunks:
                    return np.concatenate(chunks).astype(np.float32), target_sr
        except Exception:
            pass

    # 2. soundfile
    if sf is not None:
        try:
            data, sr = sf.read(io.BytesIO(audio_data), dtype="float32")
            if data.ndim > 1:
                data = np.mean(data, axis=1)
            data = data.astype(np.float32)
            if sr != target_sr and len(data) > 0:
                data = resample_linear(data, sr, target_sr)
            return data, target_sr
        except Exception:
            pass

    # 3. WAV PCM16 header
    try:
        with wave.open(io.BytesIO(audio_data), "rb") as wf:
            sr = wf.getframerate()
            nch = wf.getnchannels()
            sw = wf.getsampwidth()
            frames = wf.readframes(wf.getnframes())
            if sw == 2:
                samples = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
            elif sw == 1:
                samples = (np.frombuffer(frames, dtype=np.uint8).astype(np.float32) - 128.0) / 128.0
            else:
                samples = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
            if nch > 1:
                samples = samples.reshape(-1, nch).mean(axis=1)
            if sr != target_sr:
                samples = resample_linear(samples, sr, target_sr)
            return samples.astype(np.float32), target_sr
    except Exception:
        pass

    # 4. Raw PCM16 LE (optional WAV header strip)
    try:
        raw = audio_data[44:] if len(audio_data) >= 44 and audio_data[:4] == b"RIFF" else audio_data
        raw = raw[: len(raw) - (len(raw) % 2)]
        if len(raw) >= 4:
            samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
            return samples, target_sr
    except Exception:
        pass

    return np.array([], dtype=np.float32), target_sr


def resample_linear(samples: np.ndarray, src_sr: int, dst_sr: int) -> np.ndarray:
    if src_sr == dst_sr or len(samples) == 0:
        return samples.astype(np.float32)
    duration = len(samples) / float(src_sr)
    n_out = max(1, int(round(duration * dst_sr)))
    x_old = np.linspace(0.0, 1.0, num=len(samples), endpoint=False)
    x_new = np.linspace(0.0, 1.0, num=n_out, endpoint=False)
    return np.interp(x_new, x_old, samples).astype(np.float32)


def peak_normalize(samples: np.ndarray, peak: float = 0.95) -> np.ndarray:
    if len(samples) == 0:
        return samples
    m = float(np.max(np.abs(samples)))
    if m < 1e-8:
        return samples
    return (samples * (peak / m)).astype(np.float32)


def frame_energy_vad(
    samples: np.ndarray,
    sr: int = 16000,
    frame_ms: float = 30.0,
    hop_ms: float = 10.0,
    energy_threshold: float = 0.01,
) -> Tuple[np.ndarray, float]:
    """
    Simple energy VAD. Returns boolean frame mask and voiced_ratio.
    """
    if len(samples) == 0:
        return np.array([], dtype=bool), 0.0
    frame = max(1, int(sr * frame_ms / 1000.0))
    hop = max(1, int(sr * hop_ms / 1000.0))
    flags = []
    for i in range(0, max(0, len(samples) - frame + 1), hop):
        chunk = samples[i : i + frame]
        rms = float(np.sqrt(np.mean(chunk ** 2) + 1e-12))
        flags.append(rms >= energy_threshold)
    if not flags:
        rms = float(np.sqrt(np.mean(samples ** 2) + 1e-12))
        return np.array([rms >= energy_threshold], dtype=bool), 1.0 if rms >= energy_threshold else 0.0
    mask = np.array(flags, dtype=bool)
    return mask, float(np.mean(mask))


def assess_quality(samples: np.ndarray, sr: int = 16000) -> AudioQuality:
    if len(samples) == 0:
        return AudioQuality(0.0, sr, 0.0, 0.0, 0.0, True, False, False, "empty")
    duration_s = len(samples) / float(sr)
    rms = float(np.sqrt(np.mean(samples ** 2) + 1e-12))
    peak = float(np.max(np.abs(samples)))
    _, voiced_ratio = frame_energy_vad(samples, sr)
    is_silence = rms < 0.005 or voiced_ratio < 0.05
    is_clipped = peak >= 0.99
    ok = duration_s >= 0.2 and not is_silence
    reason = ""
    if is_silence:
        reason = "silence_or_near_silence"
    elif duration_s < 0.2:
        reason = "too_short"
    elif is_clipped:
        reason = "clipped_but_usable"
        ok = True
    return AudioQuality(duration_s, sr, rms, peak, voiced_ratio, is_silence, is_clipped, ok, reason)


def sliding_windows(
    samples: np.ndarray,
    sr: int = 16000,
    window_s: float = 1.8,
    hop_s: float = 0.9,
) -> list:
    win = max(1, int(window_s * sr))
    hop = max(1, int(hop_s * sr))
    if len(samples) < win:
        return [samples] if len(samples) else []
    out = []
    for i in range(0, len(samples) - win + 1, hop):
        out.append(samples[i : i + win])
    return out


def samples_to_wav_bytes(samples: np.ndarray, sr: int = 16000) -> bytes:
    """Encode float32 mono [-1,1] to PCM16 WAV bytes."""
    pcm = np.clip(samples, -1.0, 1.0)
    ints = (pcm * 32767.0).astype(np.int16)
    bio = io.BytesIO()
    with wave.open(bio, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(ints.tobytes())
    return bio.getvalue()


def validate_upload(
    audio_data: bytes,
    max_bytes: int = 25 * 1024 * 1024,
    max_duration_s: float = 300.0,
    target_sr: int = 16000,
) -> Tuple[bool, str, Optional[np.ndarray], AudioQuality]:
    if not audio_data:
        q = AudioQuality(0, target_sr, 0, 0, 0, True, False, False, "empty")
        return False, "empty_payload", None, q
    if len(audio_data) > max_bytes:
        q = AudioQuality(0, target_sr, 0, 0, 0, True, False, False, "too_large")
        return False, "file_too_large", None, q
    samples, sr = decode_audio_bytes(audio_data, target_sr)
    q = assess_quality(samples, sr)
    if len(samples) == 0:
        return False, "decode_failed", samples, q
    if q.duration_s > max_duration_s:
        return False, "duration_exceeded", samples, q
    return True, "ok", samples, q
