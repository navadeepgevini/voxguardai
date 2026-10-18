---
name: spectrogram-forensics
description: >-
  Use this skill when auditing, configuring, or debugging audio spectrograms in VoxGuard, including Web Audio Hann FFT client previews and Librosa STFT backend analysis evidence.
---

# VoxGuard Spectrogram Forensics Skill

## Technical Specifications

### Client Preview Spectrogram
- **Location**: `echoguard/src/components/AudioPreviewSpectrogram.tsx`
- **Engine**: Browser Web Audio API (`AudioContext.decodeAudioData`)
- **FFT Window**: 512-point Hann window, 256-point hop length
- **Colormap**: Magma (0 = #000004 black, 0.5 = #b73779 purple/red, 1.0 = #fcffa4 bright yellow)
- **Scale**: Normalized dB scale `[-90 dB, 0 dB]`
- **State Guarantee**: Client-side only; does not invoke backend inference or generate database records.

### Backend Evidence Spectrogram
- **Location**: `backend/engines/spectrogram.py`
- **Engine**: Librosa STFT / SciPy / Matplotlib Agg
- **Sampling Rate**: Standardized 16,000 Hz or native file rate
- **Window Size (`n_fft`)**: 1024 or 2048 with Hann window
- **Hop Length**: 512 samples
- **Frequency Scale**: Linear or Mel (default: linear frequency axis up to Nyquist `fs / 2`)
- **Metadata Preserved in DB**:
  - `spectrogram_image`: Base64 PNG data URI
  - `spectrogram_meta`: JSON containing sample rate, duration, FFT window, hop length, time range, frequency range.

## Verification Runbook
1. Upload a `.wav` or `.mp3` file $\rightarrow$ Preview spectrogram renders in `<500ms`.
2. Inspect network tab $\rightarrow$ Zero API calls initiated during preview.
3. Click "Start Analysis" $\rightarrow$ Backend returns `spectrogram_image` and `spectrogram_meta`.
4. Navigate to Call History $\rightarrow$ Click `[👁 Evidence]` $\rightarrow$ Verify stored backend spectrogram matches analysis evidence.
