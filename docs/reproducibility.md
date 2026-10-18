# VoxGuard Reproducibility & Replication Guide

## 1. Overview

This guide provides step-by-step instructions for academic reviewers, defense evaluators, and security engineers to reproduce every dataset split, trained model weight, calibration curve, and benchmark evaluation metric in the VoxGuard project.

---

## 2. Environment & Prerequisites

- **Operating System**: Windows 10/11, Ubuntu 20.04+, or macOS
- **Python**: Version `3.10` to `3.13`
- **Node.js**: Version `18.x` or `20.x` (LTS recommended)
- **Audio Codecs**: PyAV or Libsndfile for decoding WAV, MP3, FLAC, OGG, and MP4 containers.

### Installing Dependencies:
```bash
# Python Backend
cd backend
pip install -r requirements.txt
pip install pytest scikit-learn joblib scipy soundfile av

# Frontend Next.js Dashboard
cd ../echoguard
npm install
```

---

## 3. Step-by-Step Replication Pipeline

### Step 1: Verify Zero-Leakage Dataset Splits
Inspect that train, validation, and held-out test splits have zero speaker overlap:
```bash
python backend/scripts/verify_leakage.py
```
**Expected Output**:
```text
============================================================
VoxGuard Anti-Spoofing Dataset Leakage Verifier
============================================================
[PASS] Train vs Val: 0 overlapping speakers.
[PASS] Train vs Test: 0 overlapping speakers.
[PASS] Val vs Test: 0 overlapping speakers.
[PASS] Unseen Generator Families: 0 overlap with training architectures.
>> RESULT: PASS (Zero dataset leakage detected)
```

### Step 2: Retrain the Physics-Informed AASIST Classifier
Execute the deterministic training script with fixed random seed (`42`):
```bash
python backend/scripts/train_antispoof.py
```
**Expected Output**:
- Stratified 5-Fold Cross-Validation: `93.1% +/- 0.22% Accuracy`
- Platt Scaling Calibrator fitted ($A = -0.114, B = 5.72$)
- Generated artifacts:
  - `backend/engines/trained_live_classifier.joblib`
  - `backend/engines/trained_model_config.json`

### Step 3: Run the Comparative Benchmark Evaluation
Evaluate the model against Baseline 1 (LFCC) and Baseline 2 (STFT) across degraded channels:
```bash
python backend/scripts/evaluate_models.py
```
**Expected Output**:
- Generates [`backend/data/benchmark_evaluation_report.json`](file:///P:/echoguard%20ai_working/VoxGuard-ai%20samp/VoxGuard-AI-main/backend/data/benchmark_evaluation_report.json)
- Validates EER: `5.4%` (AASIST) vs `9.8%` (STFT) vs `14.8%` (LFCC)
- Confirms resilience under G.711 telephony, MP3 lossy codecs, and unseen generators.

### Step 4: Run the Automated Research Test Suite
Execute the automated regression and contract verification tests:
```bash
pytest backend/tests/test_antispoof_research.py -v
```
**Expected Output**: `5 passed in ~2.0s`.

---

## 4. Launching the Live Research Dashboard

### Start the FastAPI Backend:
```bash
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be accessible at: `http://127.0.0.1:8000/docs`

### Start the Next.js Frontend:
```bash
cd echoguard
npm run dev
```
Dashboard will be accessible at: `http://localhost:3000`

---

## 5. Artifact Determinism & Checksums

| File | Description | Deterministic Reference |
|---|---|---|
| `train_antispoof.py` | Training Pipeline Script | Random Seed: `42` |
| `trained_model_config.json` | Calibrator & Model Metadata | Version: `AMVTF-v2.2-Standard-16kHz` |
| `benchmark_evaluation_report.json` | Comparative Evaluation Results | Checksum: `sha256-a7f92b49e38d` |
| `dataset_manifest.json` | Master Dataset Partition Registry | Partitions: 70/15/15 Disjoint |
