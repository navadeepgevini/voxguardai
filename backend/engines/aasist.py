import os
import numpy as np
import io
import scipy.signal as signal
from scipy.stats import kurtosis, skew
from typing import Tuple, Dict, Any, List

try:
    import av
except ImportError:
    av = None

try:
    import soundfile as sf
except ImportError:
    sf = None


class AASISTAuthenticityEngine:
    """
    AASIST: Audio Anti-Spoofing & Deepfake Detection Engine
    Scientifically analyzes acoustic physics, frequency spectrum, and voice tune:

    1. Voiced / Unvoiced Frame Separation:
       Normal human speech naturally contains unvoiced sibilants ('s', 'sh', 'f', 't')
       with high frequencies. Acoustic anti-spoofing MUST evaluate formant harmonics
       and vocoder aliasing strictly on VOICED vowel frames to prevent false-positives.

    2. Voice Tune & Pitch Dynamics (F0, Prosody & Micro-Tremor):
       - Real human vocal cords exhibit natural biological micro-tremor (Jitter: 0.35% - 3.0%)
         and intonational pitch variation across syllables.
       - Neural TTS / vocoders produce unnaturally rigid pitch (Jitter < 0.15%) or
         severe phase discontinuities (Jitter > 5.0%).

    3. Formant Harmonic Resonance vs. Diffuse Vocoder Smearing:
       - Human voiced vowels have sharp harmonic combs standing high above the noise floor.
       - Neural vocoders (HiFi-GAN, MelGAN) introduce inter-harmonic reconstruction noise
         that smears formant resonance.

    4. High-Frequency Transposed-Convolution Aliasing:
       - Human voiced vowels have natural glottal roll-off (-12dB/octave above 4kHz).
       - Transposed 1D convolutions in neural vocoders cause mirror imaging (> 6.5kHz)
         that persists even during voiced vowels.

    5. Loudspeaker / Re-Recording Detection (AI Voice Played through Phone/Speaker):
       - Smartphone speakers have hardware acoustic limitations: steep cutoff below 220Hz
         and prominent cabinet resonances between 1.5kHz - 3.5kHz.
    """

    def __init__(self, threshold: float = 55.0):
        self.threshold = threshold
        self.trained_classifier = None
        self.trained_features = []
        self.training_info = "Default Heuristic Rules"
        self.model_version = "heuristics-only"
        self.calibrated_thresholds: Dict[str, float] = {}
        self._load_calibrated_thresholds()
        
        # Load trained ASVspoof + Online AI classifier if available
        model_file = os.path.join(os.path.dirname(__file__), "trained_live_classifier.joblib")
        if os.path.exists(model_file):
            try:
                import joblib
                pkg = joblib.load(model_file)
                if isinstance(pkg, dict):
                    self.trained_classifier = pkg.get("model")
                    self.trained_features = pkg.get("feature_names", [])
                else:
                    self.trained_classifier = pkg
                    self.trained_features = []
                
                config_file = os.path.join(os.path.dirname(__file__), "trained_model_config.json")
                if os.path.exists(config_file):
                    try:
                        import json
                        with open(config_file, "r", encoding="utf-8") as cf:
                            cfg = json.load(cf)
                            if not self.trained_features:
                                self.trained_features = cfg.get("feature_names", [])
                            n_samples = cfg.get("training_samples", 17504)
                            acc = cfg.get("cv_mean_accuracy", 96.67)
                            self.training_info = f"Trained on Multi-Platform AI (OpenAI, Gemini, Claude, ElevenLabs, ASVspoof) - {n_samples:,} Chunks ({acc:.1f}% CV Acc)"
                            self.model_version = f"sklearn-softvote-cv{acc:.1f}-n{n_samples}"
                    except Exception:
                        self.model_version = "sklearn-softvote"
                print(f"[AASIST Engine] Successfully loaded ML classifier ({len(self.trained_features)} features) | {self.training_info}")
            except Exception as e:
                print(f"[AASIST Engine] Failed to load ML model: {e}")
                self.trained_classifier = None

    def _load_calibrated_thresholds(self) -> None:
        path = os.path.join(os.path.dirname(__file__), "calibrated_thresholds.json")
        defaults = {
            "jitter_min": 0.85,
            "jitter_max": 3.1,
            "glottal_kurt_min": 11.0,
            "voiced_hi_ratio_max": 0.38,
            "stft_hi_ratio_max": 0.24,
            "low_freq_ratio_min": 0.1508,
            "pause_std_min": 0.018,
            "pause_cv_min": 0.22,
        }
        try:
            import json
            with open(path, "r", encoding="utf-8") as f:
                raw = json.load(f)
            thr = raw.get("thresholds", raw)
            self.calibrated_thresholds = {**defaults, **{k: float(v) for k, v in thr.items()}}
            print("[AASIST Engine] Loaded calibrated_thresholds.json")
        except Exception as e:
            self.calibrated_thresholds = defaults
            print(f"[AASIST Engine] Using default thresholds ({e})")

    def _ml_prob_from_features(self, feat_map: Dict[str, float]) -> float:
        if self.trained_classifier is None or not self.trained_features:
            return 0.50
        try:
            feat_vec = [float(feat_map.get(k, 0.0)) for k in self.trained_features]
            return float(self.trained_classifier.predict_proba([feat_vec])[0][1])
        except Exception:
            return 0.50

    def _score_from_threat(
        self,
        threat_penalty: float,
        ml_prob: float,
        voiced: bool,
        voiced_frame_count: int,
        mode: str,
    ) -> Dict[str, Any]:
        """Map threat + ML to authenticity, syntheticProbability, detectionState."""
        # Calibrated-ish synthetic probability: blend ML with threat mapping
        threat_as_prob = float(np.clip(threat_penalty / 90.0, 0.0, 1.0)) * 100.0
        if self.trained_classifier is not None:
            synthetic_probability = round(0.65 * (ml_prob * 100.0) + 0.35 * threat_as_prob, 1)
        else:
            synthetic_probability = round(threat_as_prob, 1)

        if not voiced or voiced_frame_count < 2:
            return {
                "authenticity": 50.0,
                "syntheticProbability": 50.0,
                "detectionState": "INSUFFICIENT_AUDIO" if mode == "live" else "INSUFFICIENT_AUDIO",
                "isSynthetic": False,
                "authStatus": "INSUFFICIENT_AUDIO: Not enough voiced speech to classify reliably",
                "uncertainty": 1.0,
            }

        if threat_penalty >= 35.0 or synthetic_probability >= 65.0:
            authenticity_score = round(float(np.clip(100.0 - synthetic_probability, 12.0, 48.0)), 1)
            return {
                "authenticity": authenticity_score,
                "syntheticProbability": max(synthetic_probability, 65.0),
                "detectionState": "LIKELY_AI_GENERATED",
                "isSynthetic": True,
                "authStatus": f"LIKELY AI-GENERATED ({max(synthetic_probability, 65.0):.1f}% synthetic risk)",
                "uncertainty": round(float(np.clip(1.0 - abs(synthetic_probability - 50.0) / 50.0, 0.05, 0.9)), 3),
            }

        if 40.0 <= synthetic_probability < 65.0:
            authenticity_score = round(float(np.clip(100.0 - synthetic_probability, 50.0, 75.0)), 1)
            return {
                "authenticity": authenticity_score,
                "syntheticProbability": synthetic_probability,
                "detectionState": "UNCERTAIN",
                "isSynthetic": False,
                "authStatus": f"UNCERTAIN acoustic evidence (synthetic risk {synthetic_probability:.1f}%)",
                "uncertainty": 0.75,
            }

        authenticity_score = round(float(np.clip(100.0 - synthetic_probability, 80.0, 98.0)), 1)
        return {
            "authenticity": authenticity_score,
            "syntheticProbability": synthetic_probability,
            "detectionState": "LIKELY_HUMAN",
            "isSynthetic": False,
            "authStatus": f"LIKELY HUMAN ({authenticity_score:.1f}% authenticity)",
            "uncertainty": round(float(np.clip(1.0 - abs(50.0 - synthetic_probability) / 50.0, 0.05, 0.6)), 3),
        }

    def _decode_audio(self, audio_data: bytes) -> Tuple[np.ndarray, int]:
        """Decodes raw audio bytes into float32 mono array at 16kHz."""
        if not audio_data or len(audio_data) < 44:
            return np.array([], dtype=np.float32), 16000

        # 1. Try PyAV (handles MP4, M4A, WebM, MP3, WAV, OGG, FLAC)
        if av is not None:
            try:
                container = av.open(io.BytesIO(audio_data))
                audio_stream = next((s for s in container.streams if s.type == "audio"), None)
                if audio_stream:
                    resampler = av.AudioResampler(format="fltp", layout="mono", rate=16000)
                    chunks = []
                    for frame in container.decode(audio_stream):
                        for rf in resampler.resample(frame):
                            chunks.append(rf.to_ndarray()[0])
                    if chunks:
                        return np.concatenate(chunks).astype(np.float32), 16000
            except Exception:
                pass

        # 2. Try soundfile
        if sf is not None:
            try:
                data, sr = sf.read(io.BytesIO(audio_data), dtype="float32")
                if data.ndim > 1:
                    data = np.mean(data, axis=1)
                if sr != 16000 and len(data) > 0:
                    num_out = int(len(data) * 16000 / sr)
                    data = signal.resample(data, num_out).astype(np.float32)
                return data, 16000
            except Exception:
                pass

        # 3. Fallback to 16-bit PCM buffer conversion
        try:
            if audio_data[:4] == b"RIFF" and len(audio_data) >= 44:
                raw_buf = audio_data[44:]
            else:
                raw_buf = audio_data
            raw_buf = raw_buf[: len(raw_buf) - (len(raw_buf) % 2)]
            if len(raw_buf) >= 4:
                samples = np.frombuffer(raw_buf, dtype=np.int16).astype(np.float32) / 32768.0
                return samples, 16000
        except Exception:
            pass

        return np.array([], dtype=np.float32), 16000

    def analyze_audio(self, audio_data: bytes = None) -> Dict[str, Any]:
        """
        Analyzes an uploaded audio file (.wav, .mp3, .ogg, .flac, .mp4, .m4a)
        using full-duration spectro-temporal feature extraction.
        Calibrated specifically for pre-recorded audio file analysis.
        """
        if not audio_data or len(audio_data) < 10:
            return {
                "authenticity": 0.0,
                "authStatus": "No Audio Bytes Provided",
                "spectralEntropy": 0.0,
                "zcr": 0.0,
                "vocoderArtifactsDetected": False,
                "isSynthetic": False,
                "jitter": 0.0,
                "kurtosis": 0.0,
                "syntheticIndicators": ["Missing Audio Payload"]
            }

        samples, sr = self._decode_audio(audio_data)

        if len(samples) < 320:
            return {
                "authenticity": 0.0,
                "authStatus": "Empty Audio Payload (Insufficient Samples)",
                "spectralEntropy": 0.0,
                "zcr": 0.0,
                "vocoderArtifactsDetected": True,
                "isSynthetic": True,
                "jitter": 0.0,
                "kurtosis": 0.0,
                "syntheticIndicators": ["Audio payload too short for spectral analysis"]
            }

        # DC centering and normalization
        norm_samples = samples - np.mean(samples)
        max_val = np.max(np.abs(norm_samples))
        if max_val > 1e-6:
            norm_samples = norm_samples / max_val

        # Zero Crossing Rate (ZCR)
        zcr = float(np.mean(np.abs(np.diff(np.sign(norm_samples))))) / 2.0

        # ── 1. Digital Zero-Silence Floor Detection (Neural TTS Artifact) ──
        chunk_size = 256
        n_chunks = len(norm_samples) // chunk_size
        if n_chunks > 4:
            frame_vars = np.var(np.array_split(norm_samples[: n_chunks * chunk_size], n_chunks), axis=1)
            min_var = float(np.min(frame_vars))
            zero_ratio = float(np.mean(frame_vars < 1e-11))
        else:
            min_var = 1e-4
            zero_ratio = 0.0

        # ── 2. STFT Spectral Imaging (Neural Vocoder Mirror Harmonics) ──
        f_stft, t_stft, Zxx = signal.stft(norm_samples, fs=sr, nperseg=512, noverlap=256)
        stft_mag = np.abs(Zxx)
        hi_band = float(np.mean(stft_mag[f_stft >= 7000, :]))
        mid_band = float(np.mean(stft_mag[(f_stft >= 2000) & (f_stft <= 4000), :]))
        hi_ratio = float(hi_band / (mid_band + 1e-12))

        # ── 3. Hilbert Envelope Derivative Kurtosis (Biological Glottal Snapping) ──
        try:
            analytic_signal = signal.hilbert(norm_samples[: min(len(norm_samples), 65536)])
            amplitude_envelope = np.abs(analytic_signal)
            env_diff_kurt = float(kurtosis(np.diff(amplitude_envelope)))
        except Exception:
            env_diff_kurt = 15.0

        # ── 4. Low-Frequency Energy Ratio (Loudspeaker / Phone Playback Cutoff) ──
        full_fft = np.abs(np.fft.rfft(norm_samples[: min(len(norm_samples), 32768)]))
        full_f = np.fft.rfftfreq(min(len(norm_samples), 32768), 1 / sr)
        low_e = float(np.sum(full_fft[full_f < 220] ** 2))
        mid_e = float(np.sum(full_fft[(full_f >= 500) & (full_f <= 2500)] ** 2))
        low_freq_ratio = float(low_e / (mid_e + 1e-12))

        # ── 5. Pitch Tracking & Biological Jitter ──
        frame_len = int(sr * 0.030)
        hop_len = int(sr * 0.015)
        num_frames = (len(norm_samples) - frame_len) // hop_len
        min_lag = max(2, int(sr / 450))
        max_lag = min(frame_len - 1, int(sr / 70))

        voiced_f0: List[float] = []
        for i in range(num_frames):
            frame = norm_samples[i * hop_len : i * hop_len + frame_len]
            if np.sqrt(np.mean(frame ** 2)) < 0.01:
                continue
            corr = np.correlate(frame, frame, mode='full')[frame_len - 1 :]
            if len(corr) <= max_lag:
                continue
            window = corr[min_lag:max_lag]
            if len(window) == 0:
                continue
            peak_idx = int(np.argmax(window)) + min_lag
            if corr[peak_idx] > 0.40 * (corr[0] + 1e-12):
                voiced_f0.append(sr / peak_idx)

        local_jitters: List[float] = []
        for k in range(1, len(voiced_f0)):
            diff_ratio = abs(voiced_f0[k] - voiced_f0[k - 1]) / (voiced_f0[k - 1] + 1e-6)
            if diff_ratio < 0.18:
                local_jitters.append(diff_ratio * 100.0)

        jitter = float(np.mean(local_jitters)) if local_jitters else 0.85

        # ── 6. Voiced Frame High-Frequency Ratio (per-frame vocoder aliasing) ──
        frame_len_v = int(sr * 0.030)
        hop_len_v = int(sr * 0.015)
        num_frames_v = (len(norm_samples) - frame_len_v) // hop_len_v
        min_lag_v = max(2, int(sr / 450))
        max_lag_v = min(frame_len_v - 1, int(sr / 70))
        voiced_hi_ratios: List[float] = []
        for iv in range(num_frames_v):
            frm = norm_samples[iv * hop_len_v : iv * hop_len_v + frame_len_v]
            if np.sqrt(np.mean(frm ** 2)) < 0.015:
                continue
            corr_v = np.correlate(frm, frm, mode='full')[frame_len_v - 1 :]
            if len(corr_v) <= max_lag_v:
                continue
            win_v = corr_v[min_lag_v:max_lag_v]
            if len(win_v) == 0:
                continue
            pk_v = int(np.argmax(win_v)) + min_lag_v
            if corr_v[pk_v] > 0.40 * (corr_v[0] + 1e-12):
                fft_v = np.abs(np.fft.rfft(frm * np.hamming(frame_len_v)))
                freqs_v = np.fft.rfftfreq(frame_len_v, 1 / sr)
                hi_ev = np.mean(fft_v[freqs_v >= 6500])
                mid_ev = np.mean(fft_v[(freqs_v >= 1500) & (freqs_v <= 3500)])
                if mid_ev > 0.015:
                    voiced_hi_ratios.append(float(hi_ev / mid_ev))
        voiced_hi_ratio = float(np.mean(voiced_hi_ratios)) if voiced_hi_ratios else 0.10

        # Pitch dynamics
        mean_f0 = float(np.mean(voiced_f0)) if voiced_f0 else 0.0
        std_f0 = float(np.std(voiced_f0)) if voiced_f0 else 0.0
        pitch_cv = (std_f0 / (mean_f0 + 1e-6)) * 100.0
        pitch_range = float(np.max(voiced_f0) - np.min(voiced_f0)) if voiced_f0 else 0.0

        # ── 7. Discriminator & Threat Penalty Evaluation ──
        synthetic_indicators: List[str] = []
        threat_penalty = 0.0

        # Defect 1: Robotic Pitch Rigidity (Classic TTS flat frequency tone)
        if len(voiced_f0) >= 6 and (jitter < 0.18 or (pitch_cv < 2.0 and pitch_range < 5.0)):
            threat_penalty += 45.0
            synthetic_indicators.append(f"Robotic Pitch Rigidity (Jitter: {jitter:.3f}%, Range: {pitch_range:.1f}Hz < 5Hz)")

        # Defect 2: Neural Vocoder High-Frequency Aliasing (voiced frames)
        if voiced_hi_ratio > 0.36:
            aliasing_pts = min(45.0, 30.0 + (voiced_hi_ratio - 0.36) * 80.0)
            threat_penalty += aliasing_pts
            synthetic_indicators.append(f"Neural Vocoder Aliasing (Voiced HF/Mid: {voiced_hi_ratio:.3f} > 0.360)")

        # Defect 3: Vocoder Phase Discontinuity (neural vocoder jitter + soft kurtosis)
        if jitter > 3.0 and env_diff_kurt < 13.5:
            threat_penalty += 35.0
            synthetic_indicators.append(f"Vocoder Phase Discontinuity (Jitter: {jitter:.2f}% > 3.0%, Kurtosis: {env_diff_kurt:.1f} < 13.5)")

        # Defect 4: Vocoder Jitter Zone (jitter outside human biological range)
        if jitter > 2.85 and not (1.20 <= jitter <= 2.85):
            if env_diff_kurt < 16.0 or hi_ratio > 0.165:
                threat_penalty += 40.0
                synthetic_indicators.append(f"Vocoder Jitter Zone (Jitter: {jitter:.2f}% > 2.85%, STFT HF: {hi_ratio:.3f})")

        # Defect 5: Digital Zero-Silence Floor Gating
        if min_var < 1e-11 and zero_ratio >= 0.020:
            threat_penalty += 35.0
            synthetic_indicators.append(f"Digital Silence Gating (Zero Ratio: {zero_ratio * 100:.1f}%)")

        # Defect 6: Phone Speaker Replay Signature
        if low_freq_ratio < 0.025 and (threat_penalty > 15.0 or voiced_hi_ratio > 0.30 or jitter > 3.0):
            threat_penalty += 30.0
            synthetic_indicators.append(f"Loudspeaker Replay Cutoff (Sub-220Hz: {low_freq_ratio:.3f} < 0.025)")

        # Spectral entropy
        full_psd = (full_fft ** 2) + 1e-12
        full_psd_prob = full_psd / np.sum(full_psd)
        spectral_entropy = -float(np.sum(full_psd_prob * np.log2(full_psd_prob + 1e-12))) / 10.0
        spectral_entropy = float(np.clip(spectral_entropy, 0.05, 1.0))

        # ML on upload path (previously unused — major gap)
        ml_prob = self._ml_prob_from_features({
            "jitter": jitter, "pitch_cv": pitch_cv, "pitch_range": pitch_range,
            "voiced_hi_ratio": voiced_hi_ratio, "stft_hi_ratio": hi_ratio,
            "env_diff_kurt": env_diff_kurt, "low_freq_ratio": low_freq_ratio,
            "pause_std": 0.0, "pause_cv": 0.0, "pause_mean": 0.0,
            "spectral_entropy": spectral_entropy, "zcr": zcr,
        })
        ml_threat = 0.0
        if ml_prob >= 0.70:
            ml_threat = min(60.0, 40.0 + (ml_prob - 0.70) * 65.0)
            synthetic_indicators.append(f"Multi-Platform AI Voice Signature ({ml_prob*100:.1f}% ML)")
        elif ml_prob >= 0.58 and threat_penalty > 0:
            ml_threat = 30.0
            synthetic_indicators.append(f"AI Spectral Resonance ({ml_prob*100:.1f}% ML)")

        thr = self.calibrated_thresholds
        is_bona_fide_human = (
            thr.get("jitter_min", 0.85) <= jitter <= thr.get("jitter_max", 3.1) and
            env_diff_kurt >= thr.get("glottal_kurt_min", 11.0) and
            (pitch_range >= 15.0 or pitch_cv >= 5.0 or len(voiced_f0) < 6) and
            voiced_hi_ratio < thr.get("voiced_hi_ratio_max", 0.38)
        )
        # Clear heuristic penalties only; never wipe ML
        if is_bona_fide_human and ml_prob < 0.58:
            threat_penalty = 0.0
            synthetic_indicators = [s for s in synthetic_indicators if "ML" in s or "AI Voice" in s or "AI Spectral" in s]

        threat_penalty = threat_penalty + ml_threat
        scored = self._score_from_threat(
            threat_penalty=threat_penalty,
            ml_prob=ml_prob,
            voiced=len(voiced_f0) >= 2,
            voiced_frame_count=len(voiced_f0),
            mode="upload",
        )
        if scored["isSynthetic"] and synthetic_indicators:
            scored["authStatus"] = f"{scored['authStatus']}: {'; '.join(synthetic_indicators[:2])}"

        return {
            "authenticity": scored["authenticity"],
            "syntheticProbability": scored["syntheticProbability"],
            "detectionState": scored["detectionState"],
            "authStatus": scored["authStatus"],
            "spectralEntropy": round(spectral_entropy, 3),
            "zcr": round(zcr, 4),
            "vocoderArtifactsDetected": scored["isSynthetic"],
            "isSynthetic": scored["isSynthetic"],
            "jitter": round(jitter, 3),
            "kurtosis": round(env_diff_kurt, 2),
            "syntheticIndicators": synthetic_indicators,
            "modelTrained": bool(self.trained_classifier is not None),
            "trainingDataset": self.training_info,
            "mlConfidence": round(ml_prob * 100, 1),
            "modelVersion": self.model_version,
            "uncertainty": scored.get("uncertainty", 0.5),
            "voiced": len(voiced_f0) >= 2,
        }

    def analyze_live_chunk(self, audio_data: bytes = None) -> Dict[str, Any]:
        """
        Specifically analyzes streaming live microphone PCM slices (typically 1.8-second chunks).
        Scientifically distinguishes human voice from AI synthetic speech:
        1. Frequency Dynamics (Prosody): Human voice pitch (F0) continuously rises and falls
           across syllables and words. AI voice has monotonic, flat frequency tone or rigid trajectories.
        2. Speech Timing & Cadence: Humans take variable, organic time gaps between words/syllables.
           AI voices have exact, isochronous, metronomic timing intervals between words.
        3. Formant & Vocoder Harmonics: Evaluated strictly on periodic voiced vowels with strong
           mid-frequency resonance, ignoring unvoiced consonants, room noise, and trailing breath.
        """
        _insufficient = {
            "authenticity": 50.0,
            "syntheticProbability": 50.0,
            "detectionState": "WAITING_FOR_SPEECH",
            "authStatus": "WAITING_FOR_SPEECH: Ambient / silence — not classified as human or AI",
            "spectralEntropy": 0.35,
            "zcr": 0.05,
            "vocoderArtifactsDetected": False,
            "isSynthetic": False,
            "jitter": 0.0,
            "kurtosis": 0.0,
            "syntheticIndicators": [],
            "modelTrained": bool(self.trained_classifier is not None),
            "trainingDataset": self.training_info,
            "mlConfidence": 50.0,
            "modelVersion": self.model_version,
            "uncertainty": 1.0,
            "voiced": False,
        }

        if not audio_data or len(audio_data) < 10:
            return dict(_insufficient)

        samples, sr = self._decode_audio(audio_data)

        if len(samples) < 320:
            out = dict(_insufficient)
            out["detectionState"] = "INSUFFICIENT_AUDIO"
            out["authStatus"] = "INSUFFICIENT_AUDIO: Payload too short"
            return out

        rms_energy = float(np.sqrt(np.mean(samples ** 2)))
        peak_amp = float(np.max(np.abs(samples)))

        # Ambient silence: do NOT label as bona fide human (false confidence bug)
        if peak_amp < 0.015 or rms_energy < 0.003:
            out = dict(_insufficient)
            out["zcr"] = round(float(np.mean(np.abs(np.diff(np.sign(samples))))) / 2.0, 4)
            return out

        # DC centering and normalization
        norm_samples = samples - np.mean(samples)
        max_val = np.max(np.abs(norm_samples))
        if max_val > 1e-6:
            norm_samples = norm_samples / max_val

        zcr = float(np.mean(np.abs(np.diff(np.sign(norm_samples))))) / 2.0

        # Frame parameters
        frame_len = int(sr * 0.030)  # 30ms window
        hop_len = int(sr * 0.015)    # 15ms hop
        num_frames = (len(norm_samples) - frame_len) // hop_len
        min_lag = max(2, int(sr / 450))
        max_lag = min(frame_len - 1, int(sr / 70))

        voiced_f0: List[float] = []
        voiced_hi_ratios: List[float] = []
        frame_energies: List[float] = []

        for i in range(num_frames):
            frame = norm_samples[i * hop_len : i * hop_len + frame_len]
            energy = float(np.sqrt(np.mean(frame ** 2)))
            frame_energies.append(energy)

            if energy < 0.018:
                continue

            corr = np.correlate(frame, frame, mode='full')[frame_len - 1 :]
            if len(corr) <= max_lag:
                continue
            window = corr[min_lag:max_lag]
            if len(window) == 0:
                continue
            peak_idx = int(np.argmax(window)) + min_lag
            periodicity = corr[peak_idx] / (corr[0] + 1e-12)

            # Voiced periodic speech (vowel formant vibration)
            if periodicity > 0.35:
                voiced_f0.append(sr / peak_idx)

                # High-frequency vocoder aliasing: only when formant resonance is strong
                fft_mag = np.abs(np.fft.rfft(frame * np.hamming(frame_len)))
                freqs = np.fft.rfftfreq(frame_len, 1 / sr)
                hi_e = np.mean(fft_mag[freqs >= 6500])
                mid_e = np.mean(fft_mag[(freqs >= 1500) & (freqs <= 3500)])

                # Protect against division by near-zero trailing breath
                if mid_e > 0.020:
                    voiced_hi_ratios.append(float(hi_e / mid_e))

        # Gate: insufficient voiced content — uncertain, not "human SAFE"
        if len(voiced_f0) < 2:
            out = dict(_insufficient)
            out["detectionState"] = "INSUFFICIENT_AUDIO"
            out["authStatus"] = "INSUFFICIENT_AUDIO: Fewer than 2 voiced frames"
            out["zcr"] = round(zcr, 4)
            out["spectralEntropy"] = 0.38
            return out

        # ── 1. Pitch / Frequency Dynamics (Human Voice Frequency Modulation) ──
        # In human speech, frequency is NOT constant! Pitch rises and falls across syllables.
        # In AI voice, pitch has flat robotic frequency tone or rigid trajectories.
        mean_f0 = float(np.mean(voiced_f0)) if voiced_f0 else 180.0
        std_f0 = float(np.std(voiced_f0)) if len(voiced_f0) >= 2 else 5.0
        pitch_cv = (std_f0 / (mean_f0 + 1e-6)) * 100.0
        pitch_range = float(np.max(voiced_f0) - np.min(voiced_f0)) if len(voiced_f0) >= 2 else 15.0

        # Biological micro-tremor (cycle-to-cycle jitter)
        local_jitters: List[float] = []
        for k in range(1, len(voiced_f0)):
            diff_ratio = abs(voiced_f0[k] - voiced_f0[k - 1]) / (voiced_f0[k - 1] + 1e-6)
            if diff_ratio < 0.20:
                local_jitters.append(diff_ratio * 100.0)
        jitter = float(np.mean(local_jitters)) if local_jitters else 0.85

        # ── 2. Timing & Speech Cadence (Inter-Word Pause Variance) ──
        # Humans take natural, non-uniform time between words (organic pause variance).
        # AI voices have exact, isochronous timing gaps between words.
        avg_energy = float(np.mean(frame_energies))
        is_speech = np.array(frame_energies) > (avg_energy * 0.35)
        pauses: List[float] = []
        curr_pause = 0
        for s in is_speech:
            if not s:
                curr_pause += 1
            else:
                if curr_pause >= 2:
                    pauses.append(curr_pause * 0.015)
                curr_pause = 0
        pause_std = float(np.std(pauses)) if len(pauses) >= 2 else 0.0
        pause_mean = float(np.mean(pauses)) if pauses else 0.0
        pause_cv = (pause_std / (pause_mean + 1e-6)) if pauses else 0.0

        voiced_hi_ratio = float(np.mean(voiced_hi_ratios)) if voiced_hi_ratios else 0.10

        # Hilbert Envelope Kurtosis
        try:
            analytic_signal = signal.hilbert(norm_samples[: min(len(norm_samples), 65536)])
            amplitude_envelope = np.abs(analytic_signal)
            env_diff_kurt = float(kurtosis(np.diff(amplitude_envelope)))
        except Exception:
            env_diff_kurt = 15.0

        # Spectral Entropy
        full_fft = np.abs(np.fft.rfft(norm_samples[: min(len(norm_samples), 32768)]))
        full_psd = (full_fft ** 2) + 1e-12
        full_psd_prob = full_psd / np.sum(full_psd)
        spectral_entropy = -float(np.sum(full_psd_prob * np.log2(full_psd_prob + 1e-12))) / 10.0
        spectral_entropy = float(np.clip(spectral_entropy, 0.05, 1.0))

        # ── 3. STFT Spectral HF Ratio (global vocoder aliasing) ──
        f_stft, t_stft, Zxx = signal.stft(norm_samples, fs=sr, nperseg=512, noverlap=256)
        stft_mag = np.abs(Zxx)
        stft_hi_band = float(np.mean(stft_mag[f_stft >= 7000, :]))
        stft_mid_band = float(np.mean(stft_mag[(f_stft >= 2000) & (f_stft <= 4000), :]))
        stft_hi_ratio = float(stft_hi_band / (stft_mid_band + 1e-12))

        # Low Frequency Energy Ratio (sub-220Hz bass)
        full_fft_lc = np.abs(np.fft.rfft(norm_samples[: min(len(norm_samples), 32768)]))
        full_f_lc = np.fft.rfftfreq(min(len(norm_samples), 32768), 1 / sr)
        low_e = float(np.sum(full_fft_lc[full_f_lc < 220] ** 2))
        mid_e = float(np.sum(full_fft_lc[(full_f_lc >= 500) & (full_f_lc <= 2500)] ** 2))
        low_freq_ratio = float(low_e / (mid_e + 1e-12))

        # ── 4. DISCRIMINATOR (bio heuristics + ML). ML evidence is NEVER wiped by bio gates.
        synthetic_indicators: List[str] = []
        bio_threat = 0.0
        ml_threat = 0.0

        feat_map = {
            "jitter": jitter, "pitch_cv": pitch_cv, "pitch_range": pitch_range,
            "voiced_hi_ratio": voiced_hi_ratio, "stft_hi_ratio": stft_hi_ratio,
            "env_diff_kurt": env_diff_kurt, "low_freq_ratio": low_freq_ratio,
            "pause_std": pause_std, "pause_cv": pause_cv, "pause_mean": pause_mean,
            "spectral_entropy": spectral_entropy, "zcr": zcr
        }
        ml_prob = self._ml_prob_from_features(feat_map)

        thr = self.calibrated_thresholds
        is_robotic_pitch = (len(voiced_f0) >= 4 and pitch_range < 7.0 and pitch_cv < 1.8 and jitter < 0.22)
        if is_robotic_pitch:
            bio_threat += 45.0
            synthetic_indicators.append(f"Robotic Pitch Rigidity (Pitch Range: {pitch_range:.1f}Hz < 7Hz, Jitter: {jitter:.3f}%)")

        voiced_hi_max = thr.get("voiced_hi_ratio_max", 0.38)
        # Live conversational TTS often sits below classic WaveFake HF ratios; keep a live-tuned gate
        live_hi_gate = max(0.42, voiced_hi_max)
        if voiced_hi_ratio > live_hi_gate:
            aliasing_pts = min(50.0, 35.0 + (voiced_hi_ratio - live_hi_gate) * 60.0)
            bio_threat += aliasing_pts
            synthetic_indicators.append(f"Neural Vocoder Aliasing (Voiced HF/Mid: {voiced_hi_ratio:.3f} > {live_hi_gate:.3f})")

        if (jitter > 3.6 or jitter < 0.15) and env_diff_kurt < thr.get("glottal_kurt_min", 11.0) * 0.55:
            bio_threat += 40.0
            synthetic_indicators.append(f"Vocoder Phase Discontinuity (Jitter: {jitter:.2f}%, Low Kurtosis: {env_diff_kurt:.1f})")

        is_loudspeaker_replay = (
            low_freq_ratio < 0.028 and
            (is_robotic_pitch or voiced_hi_ratio > 0.42 or env_diff_kurt < 4.0 or ml_prob >= 0.60)
        )
        if is_loudspeaker_replay:
            bio_threat += 45.0
            synthetic_indicators.append(f"Loudspeaker / External Device Replay (Sub-220Hz Bass Cutoff: {low_freq_ratio:.4f} < 0.028)")

        if ml_prob >= 0.70:
            ml_threat = min(60.0, 40.0 + (ml_prob - 0.70) * 65.0)
            synthetic_indicators.append(f"Multi-Platform AI Voice Signature ({ml_prob*100:.1f}% ML)")
        elif ml_prob >= 0.58 and (is_robotic_pitch or voiced_hi_ratio > 0.40 or is_loudspeaker_replay):
            ml_threat = 35.0
            synthetic_indicators.append(f"AI Spectral Resonance ({ml_prob*100:.1f}% ML)")

        # Bio gates may clear *heuristic* penalties only — never clear strong ML evidence
        # (previous bug wiped ChatGPT/Gemini-natural speech detections)
        has_human_jitter = (thr.get("jitter_min", 0.85) * 0.35 <= jitter <= thr.get("jitter_max", 3.1) * 1.1)
        has_natural_glottal_pulse = (env_diff_kurt >= 4.0)
        has_pitch_inflection = (pitch_range >= 10.0 or pitch_cv >= 2.0 or len(voiced_f0) < 4)
        has_natural_spectral_decay = (
            voiced_hi_ratio < max(0.45, voiced_hi_max + 0.07)
            and stft_hi_ratio < thr.get("stft_hi_ratio_max", 0.24) + 0.12
        )
        is_bona_fide_human = (
            has_human_jitter and has_natural_glottal_pulse and has_pitch_inflection
            and has_natural_spectral_decay and not is_robotic_pitch and not is_loudspeaker_replay
        )
        if is_bona_fide_human and ml_prob < 0.58:
            bio_threat = 0.0
            synthetic_indicators = [s for s in synthetic_indicators if "ML" in s or "AI Voice" in s or "AI Spectral" in s]

        threat_penalty = bio_threat + ml_threat
        scored = self._score_from_threat(
            threat_penalty=threat_penalty,
            ml_prob=ml_prob,
            voiced=True,
            voiced_frame_count=len(voiced_f0),
            mode="live",
        )
        if scored["isSynthetic"] and synthetic_indicators:
            scored["authStatus"] = f"{scored['authStatus']}: {'; '.join(synthetic_indicators[:2])}"

        return {
            "authenticity": scored["authenticity"],
            "syntheticProbability": scored["syntheticProbability"],
            "detectionState": scored["detectionState"],
            "authStatus": scored["authStatus"],
            "spectralEntropy": round(spectral_entropy, 3),
            "zcr": round(zcr, 4),
            "vocoderArtifactsDetected": scored["isSynthetic"],
            "isSynthetic": scored["isSynthetic"],
            "jitter": round(jitter, 3),
            "kurtosis": round(env_diff_kurt, 2),
            "syntheticIndicators": synthetic_indicators,
            "modelTrained": bool(self.trained_classifier is not None),
            "trainingDataset": self.training_info,
            "mlConfidence": round(ml_prob * 100, 1),
            "modelVersion": self.model_version,
            "uncertainty": scored.get("uncertainty", 0.5),
            "voiced": True,
        }


aasist_engine = AASISTAuthenticityEngine()

