#!/usr/bin/env python3
"""Detect CPU/GPU/RAM for VoxGuard CPU vs GPU work routing."""
from __future__ import annotations

import json
import platform
import os


def main() -> int:
    info = {
        "platform": platform.platform(),
        "machine": platform.machine(),
        "processor": platform.processor(),
        "python": platform.python_version(),
        "cpu_count": os.cpu_count(),
        "torch": None,
        "cuda": None,
        "recommendation": "cpu_phase",
    }
    try:
        import psutil

        info["ram_gb"] = round(psutil.virtual_memory().total / (1024**3), 2)
        info["ram_available_gb"] = round(psutil.virtual_memory().available / (1024**3), 2)
    except ImportError:
        info["ram_gb"] = None

    try:
        import torch

        info["torch"] = {
            "version": torch.__version__,
            "cuda_available": torch.cuda.is_available(),
            "cuda_version": getattr(torch.version, "cuda", None),
            "device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
        }
        if torch.cuda.is_available():
            props = torch.cuda.get_device_properties(0)
            info["cuda"] = {
                "name": torch.cuda.get_device_name(0),
                "vram_gb": round(props.total_memory / (1024**3), 2),
                "major": props.major,
                "minor": props.minor,
            }
            info["recommendation"] = "gpu_phase_ready"
        else:
            info["recommendation"] = "cpu_phase_torch_cpu_ok"
    except ImportError:
        info["torch"] = {"installed": False}
        info["recommendation"] = "cpu_phase_sklearn"

    print(json.dumps(info, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
