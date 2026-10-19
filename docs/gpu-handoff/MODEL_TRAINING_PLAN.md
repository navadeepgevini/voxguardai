# Model Training Plan (RTX 3060 6 GB)

## Recommended first model

**AASIST-L** ([clovaai/aasist](https://github.com/clovaai/aasist), ~85k params)

- Strong in-domain ASVspoof 2019 LA history
- Cross-domain gap expected (InTheWild EER much higher in public benches)
- Fits 6 GB with conservative batches

## Do not start with

- Full WavLM / HuBERT fine-tune of all layers (likely VRAM/time heavy)
- Multiple large models simultaneously

## Recipe

Config: `ml/configs/train_gpu_rtx3060.yaml`

1. Build speaker/generator-disjoint splits from `data/eval/manifest.csv`
2. Load official AASIST-L weights (verify license + sha256)
3. Fine-tune with AMP + grad accumulation; early stop on **val EER / TPR@1%FPR**
4. Calibrate scores on val (Platt/isotonic)
5. Freeze test evaluation once
6. Save `artifacts/checkpoints/best.pt` with `{state_dict, version, metrics, git_commit_or_snapshot_id}`

## Integration

Implement real forward pass in `TorchCheckpointDetector` (currently refuses to invent scores).  
Keep `SklearnAasistDetector` as default fallback (`VOXGUARD_DETECTOR_BACKEND=sklearn`).

## Honesty rule

Never report ChatGPT/Gemini rates without authorized labeled files in the eval set.
