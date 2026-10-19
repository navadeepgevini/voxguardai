# GPU Setup — RTX 3060 Laptop 6 GB

## 1. Driver

Install a recent NVIDIA Game Ready / Studio driver. Confirm in Device Manager: **NVIDIA GeForce RTX 3060 Laptop GPU**.

```bat
nvidia-smi
```

Note driver version and CUDA capability reported.

## 2. Python

Use Python 3.11 or 3.12 (Laptop 1 verified 3.12.5). Prefer a fresh venv.

## 3. PyTorch + CUDA

Example (CUDA 12.4 wheels — verify against [pytorch.org](https://pytorch.org)):

```bat
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu124
python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"
```

## 4. Project deps

```bat
pip install -r backend\requirements.txt
pip install pyyaml soundfile av
```

Optional later: `speechbrain`, `transformers` — only when G04 WavLM path is chosen.

## 5. Environment

```bat
set ENVIRONMENT=development
set VOXGUARD_DETECTOR_BACKEND=sklearn
set VOXGUARD_TORCH_CHECKPOINT=
```

After a successful train:

```bat
set VOXGUARD_DETECTOR_BACKEND=auto
set VOXGUARD_TORCH_CHECKPOINT=C:\voxguardai\artifacts\checkpoints\best.pt
```

## 6. Memory rules (6 GB)

- Start `batch_size=2` or `4`
- `mixed_precision: true`
- `gradient_accumulation: 4–8`
- Prefer **AASIST-L** over full WavLM fine-tune
- Freeze large SSL encoders; train a small head if trying WavLM
- Measure peak VRAM before increasing model size
