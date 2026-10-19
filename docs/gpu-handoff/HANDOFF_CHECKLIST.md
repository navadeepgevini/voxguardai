# Handoff Checklist

## Before leaving Laptop 1

- [x] Detector interface + sklearn backend
- [x] Real `/ws/live-analyze`
- [x] Audio preprocess tests
- [x] Metrics + manifest tooling
- [x] GPU configs + docs
- [ ] `npm run build` in echoguard (run if time)
- [ ] No `.env` / private audio / secrets in transfer bundle

## On Laptop 2 first session

- [ ] `nvidia-smi` OK
- [ ] `python scripts/detect_hardware.py` → `gpu_phase_ready`
- [ ] Manifest populated with authorized audio
- [ ] Dry-run GPU train config
- [ ] AASIST-L weights downloaded with checksum recorded
- [ ] First val metrics logged under `artifacts/logs/`
