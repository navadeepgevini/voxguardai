# Project Roadmap — CPU then RTX 3060

```text
Laptop 1 (now)                          Laptop 2 (later)
─────────────────                       ─────────────────
Audit + security gates                  CUDA/PyTorch setup
Audio preprocess + VAD                  AASIST-L load + bench
Detector interface (sklearn)            Fine-tune + calibrate
Real /ws/live-analyze                   Wire torch backend
Dataset/metrics/train scaffolding       Held-out TPR@1%FPR
Live UI detection states                Export ONNX → CPU fallback
Tests + handoff docs                    Re-verify on Laptop 1 CPU
```

## Success criteria — CPU phase

- [x] Honest health endpoint (no fake GNN claims)
- [x] Auth on critical routes (prior workstream)
- [x] Shared audio preprocess + tests
- [x] Detector abstraction with CPU backend
- [x] Real WebSocket inference path
- [x] Eval/metrics/train scaffolding
- [x] GPU handoff package
- [ ] Frontend production build verified
- [ ] Broader API integration tests
- [ ] Authorized eval audio present (blocked on data)

## Success criteria — GPU phase

- [ ] Measured AASIST-L vs sklearn on same holdout
- [ ] Checkpoint checksum + version registered
- [ ] TPR@1%FPR reported honestly (no fabricated ChatGPT numbers)
- [ ] Peak VRAM < 5.5 GB for chosen recipe
- [ ] CPU fallback remains functional
