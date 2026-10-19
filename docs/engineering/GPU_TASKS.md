# GPU Tasks (Laptop 2 — RTX 3060 Laptop 6 GB)

Only tasks that **require** CUDA acceleration or could not be completed without larger neural training.

| ID | Task | Priority | Status | Why GPU | Notes |
|----|------|----------|--------|---------|-------|
| G01 | Install CUDA + PyTorch matching driver | P0 | REQUIRES GPU | CUDA | See `docs/gpu-handoff/GPU_SETUP.md` |
| G02 | AASIST-L inference benchmark vs sklearn | P0 | REQUIRES GPU | Speed + batch | CPU possible but slow; prefer GPU |
| G03 | Fine-tune AASIST-L on authorized set | P0 | REQUIRES GPU | Training | batch=4, AMP, grad accum |
| G04 | Optional WavLM-base head (linear) | P1 | REQUIRES GPU | VRAM | Freeze encoder if OOM |
| G05 | Multi-generator held-out benchmark | P0 | REQUIRES GPU | Throughput | Same metrics as `ml/metrics.py` |
| G06 | ChatGPT/Gemini authorized sample eval | P0 | BLOCKED | Data + GPU optional | Collection is legal/process, not GPU |
| G07 | Quantization / ONNX export | P1 | REQUIRES GPU | Validate | Then re-test on CPU laptop |
| G08 | Peak VRAM profiling | P0 | REQUIRES GPU | Hardware | Record in EXPECTED_RESOURCES |
| G09 | Wire TorchCheckpointDetector graph | P0 | REQUIRES GPU | Integration | After G03 checkpoint |
| G10 | Distillation to tiny student | P2 | REQUIRES GPU | Optional | Only if latency needs |

**Not GPU tasks (do on Laptop 1):** frontend, FastAPI routes, auth, DB, WS protocol, manifests, metrics math, sklearn path, docs.
