import io
import base64
import numpy as np
import scipy.signal as signal
from typing import Dict, Any, Optional, List
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

class BackendSpectrogramEngine:
    """
    AMVTF Backend Spectrogram Evidence Engine.
    Generates scientifically authentic Short-Time Fourier Transform (STFT)
    spectrograms directly from normalized 16kHz audio arrays used for deepfake inference.
    """

    def __init__(self, sample_rate: int = 16000, n_fft: int = 512, hop_length: int = 256):
        self.sample_rate = sample_rate
        self.n_fft = n_fft
        self.hop_length = hop_length
        self.preprocessing_version = "AMVTF-v2.1-Preprocessed-16kHz"

    def generate_spectrogram(
        self,
        samples: np.ndarray,
        filename: str,
        analysis_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Computes STFT magnitude and renders an official evidence spectrogram.
        Returns metadata and Base64-encoded PNG image.
        """
        if samples is None or len(samples) == 0:
            return {
                "available": False,
                "reason": "Audio buffer is empty or could not be decoded."
            }

        # Ensure float32 array
        samples = samples.astype(np.float32)
        duration_seconds = float(len(samples) / self.sample_rate)

        # 1. Compute Short-Time Fourier Transform (STFT)
        # Using Hann window with 512-point FFT and 256-point overlap (50% hop)
        nperseg = min(self.n_fft, max(64, len(samples)))
        noverlap = min(self.hop_length, nperseg // 2)

        frequencies, times, Zxx = signal.stft(
            samples,
            fs=self.sample_rate,
            window="hann",
            nperseg=nperseg,
            noverlap=noverlap,
            boundary="zeros"
        )

        # 2. Magnitude in decibels (dB)
        # 20 * log10(|Zxx|) with floor at -80 dB
        magnitude = np.abs(Zxx)
        ref_val = np.max(magnitude) + 1e-9
        S_db = 20.0 * np.log10(np.maximum(magnitude / ref_val, 1e-4)) # clipped between -80 dB and 0 dB

        # 3. Render official Evidence Spectrogram using matplotlib Agg
        # Dark navy SOC palette background (#0B1120) with magma/inferno colormap
        fig = plt.figure(figsize=(9, 3.2), dpi=120, facecolor="#0B1120")
        ax = fig.add_subplot(111)
        ax.set_facecolor("#0B1120")

        # Color mesh plot with warmer colors for higher acoustic energy
        pcm = ax.pcolormesh(
            times,
            frequencies,
            S_db,
            shading="gouraud",
            cmap="magma",
            vmin=-80.0,
            vmax=0.0
        )

        # Label axes
        ax.set_ylabel("Frequency (Hz)", color="#94A3B8", fontsize=8, fontweight="medium")
        ax.set_xlabel("Time (s)", color="#94A3B8", fontsize=8, fontweight="medium")
        ax.set_ylim([0, self.sample_rate / 2]) # 0 Hz to 8000 Hz Nyquist
        ax.set_xlim([0, max(0.1, duration_seconds)])

        # Stylize ticks
        ax.tick_params(colors="#94A3B8", labelsize=8)
        for spine in ax.spines.values():
            spine.set_edgecolor("#334155")
            spine.set_linewidth(0.8)

        # Add grid lines for time-frequency reference
        ax.grid(color="#1E293B", linestyle="--", linewidth=0.5, alpha=0.7)

        # Add colorbar for energy level (dB)
        cbar = fig.colorbar(pcm, ax=ax, pad=0.02, aspect=18)
        cbar.set_label("Energy (dB)", color="#94A3B8", fontsize=7)
        cbar.ax.tick_params(colors="#94A3B8", labelsize=7)
        cbar.outline.set_edgecolor("#334155")

        fig.tight_layout(pad=1.0)

        # Save to buffer
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=120, facecolor=fig.get_facecolor(), edgecolor="none")
        plt.close(fig)

        data_url = f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode('ascii')}"

        clean_filename = filename.split("/")[-1].split("\\")[-1]
        summary_text = (
            f"Spectrogram for {clean_filename}, duration {duration_seconds:.2f}s, "
            f"sample rate {self.sample_rate} Hz (FFT: {self.n_fft}, Hop: {self.hop_length})."
        )

        return {
            "available": True,
            "analysis_id": analysis_id,
            "filename": clean_filename,
            "sample_rate": self.sample_rate,
            "n_fft": self.n_fft,
            "hop_length": self.hop_length,
            "frequency_scale": "Linear (0 - 8000 Hz)",
            "frequency_range": [0.0, float(self.sample_rate / 2)],
            "duration_seconds": round(duration_seconds, 2),
            "time_range": [0.0, round(duration_seconds, 2)],
            "preprocessing_version": self.preprocessing_version,
            "num_frames": int(len(times)),
            "num_bins": int(len(frequencies)),
            "data_url": data_url,
            "summary": summary_text
        }

spectrogram_engine = BackendSpectrogramEngine()
