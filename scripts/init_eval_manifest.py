#!/usr/bin/env python3
"""Create data/eval/manifest.csv template + folder scaffolding."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ml.dataset import write_template_manifest


def main() -> int:
    base = ROOT / "data" / "eval"
    for name in ("human", "ai_chatgpt", "ai_gemini", "ai_elevenlabs", "ai_other", "degraded"):
        (base / name).mkdir(parents=True, exist_ok=True)
    write_template_manifest(base / "manifest.csv")
    print(f"Created folders under {base}")
    print(f"Template manifest: {base / 'manifest.csv'}")
    print("Replace example rows with authorized licensed samples before training.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
