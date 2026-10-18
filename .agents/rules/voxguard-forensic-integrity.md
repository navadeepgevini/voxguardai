# VoxGuard Forensic Audio Integrity Rules

Preserve security operations and forensic evidence standards across the VoxGuard codebase:

1. **Dual Spectrogram Separation**:
   - Preview Spectrogram: generated strictly in the browser using Web Audio Hann FFT before user clicks Evaluate. Must NOT trigger analysis jobs, database rows, or alerts.
   - Analysis Spectrogram: generated in Python backend (`backend/engines/spectrogram.py`) from normalized audio passed to inference. Must be stored in SQLite with full metadata (sample rate, FFT size, hop length, time/frequency range).

2. **Zero Fake Acoustic Data**:
   - Never render synthetic, random, or placeholder spectrograms. If rendering fails, display a clear, honest error or unavailable indicator.

3. **Automated Incident Escalation**:
   - When AMVTF / AASIST inference detects a deepfake verdict (score >= 0.70), automatically dispatch Resend email alerts and persist incident status in Call History.

4. **Resource Lifecycle**:
   - Always revoke object URLs and disconnect Web Audio contexts upon file replacement or page navigation to prevent memory leaks in the browser.
