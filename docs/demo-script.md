---
title: VoxGuard AI — Project Evaluator & Viva Demo Script
project: B.Tech Major Project — Deepfake Audio Authentication Guard
version: 1.0.0
tags:
  - demo-script
  - evaluation-walkthrough
  - viva-demo
---

# VoxGuard AI — Project Evaluator & Viva Demo Script

## 1. Demo Preparation & Pre-Flight Checks
- **Time Required**: ~5 to 7 minutes.
- **Target Audience**: B.Tech External Examiners, Project Evaluators, SOC Analysts.
- **Prerequisites**:
  - Run `run_project.bat` (launches FastAPI backend on `:8000` and Next.js frontend on `:3000`).
  - Open browser at `http://localhost:3000`.

---

## 2. Step-by-Step Demonstration Walkthrough

### Step 1: System Overview & Architecture (1 Minute)
1. **Explain the Objective**: "VoxGuard is an enterprise biometric security platform designed to detect deepfake audio, verify caller identities against enrolled voiceprints, and prevent voice-cloning fraud in real time."
2. **Highlight the SOC Dashboard Layout**: Show the dark-navy/orange security operations interface, Live Analysis, Call History, Identities, and Settings.

### Step 2: Audio Selection & Client Preview Spectrogram (1.5 Minutes)
1. In the **Audio Upload** panel on the Live Analysis dashboard, click **Browse Files** and select a recorded `.wav` or `.mp3` file.
2. **Point out the Audio Preview Spectrogram**:
   - Note the real-time client-side STFT waveform rendering in the Magma colormap.
   - Point out the label: `Audio Preview Spectrogram (Preview only — analysis has not started)`.
   - **Crucial Academic Point**: Emphasize that the preview is generated entirely in the browser using the Web Audio API without consuming backend GPU compute or creating unverified database records.
   - Click the play button to preview the real selected audio directly in the site.

### Step 3: Analysis Execution & Evidentiary Spectrogram (1.5 Minutes)
1. Click the orange **Start Analysis** / **Evaluate** button.
2. **Observe Real-Time Pipeline Execution**:
   - The backend normalizes the audio to 16 kHz mono.
   - The AASIST acoustic engine extracts 12 physical features (Spectral Entropy, ZCR, Jitter, Shimmer, HFER).
   - The ECAPA-TDNN engine compares speech embeddings against enrolled voiceprints.
   - The NLP engine transcribes speech and detects threat keywords.
3. **Inspect the Output**:
   - **Verdict Badge**: Shows `LIKELY GENUINE` or `LIKELY SYNTHETIC / DEEPFAKE`.
   - **Fused Threat Score Gauge**: Displays the calculated AMVTF risk percentage.
   - **Analysis Spectrogram**: Renders the official backend-generated STFT image generated from the exact audio used by the ML model.

### Step 4: Call History & Forensic Audit Trail (1 Minute)
1. Navigate to the **Call History** page (`/call-history`).
2. Show that the analysis just performed is permanently recorded with a unique ID (e.g. `VX-8915`), timestamp, caller label, authenticity percentage, and verdict.
3. Click the **[👁 Evidence]** button on the row:
   - Observe the inline accordion expansion.
   - Shows the stored backend STFT spectrogram, sample rate (16,000 Hz), FFT window (512), hop length (256), and duration metadata.

### Step 5: Identities & Biometric Enrollment (1 Minute)
1. Navigate to the **Identities** page (`/identities`).
2. Demonstrate how authorized speakers are enrolled with voiceprint hashes.
3. Explain that VoxGuard separates **Acoustic Authenticity** (Is it synthetic audio?) from **Speaker Identity** (Is this person who they claim to be?).

### Step 6: Settings & Resend Incident Escalation (1 Minute)
1. Navigate to the **Settings** page (`/settings`).
2. Show the configurable detection thresholds (AASIST sensitivity, ECAPA threshold, NLP urgency sensitivity).
3. Demonstrate the **Email Notifications** section:
   - Show configured verified SOC recipients.
   - Click **Send Test Alert** to show instant delivery confirmation via Resend (or the non-blocking Demo Relay if running offline).
