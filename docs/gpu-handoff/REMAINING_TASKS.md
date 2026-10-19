# Remaining Tasks After CPU Phase

## Must do on RTX 3060

1. CUDA/PyTorch install + `detect_hardware.py` green for CUDA
2. Obtain licensed ASVspoof / authorized conversational TTS samples (process may start on either laptop)
3. AASIST-L checkpoint load + latency/VRAM bench
4. Fine-tune or calibrate on train/val only
5. Held-out metrics via `ml.metrics.full_report`
6. Export `best.pt` + checksum; wire `TorchCheckpointDetector`
7. Optional ONNX for Laptop 1 CPU serving

## Can still do on Ultra 7 (CPU) anytime

- `npm install` + `npm run build` in echoguard (node_modules may be missing locally)
- Admin role guards on destructive routes
- CI YAML (`.github/workflows`)
- Collect authorized recordings (no GPU needed)
- Broader WebSocket concurrency tests
