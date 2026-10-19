"""
Dataset manifest loader for authenticity training/eval.

Manifest CSV columns (minimum):
  path,label,generator,language,codec,duration_s,sha256,license,split

Paths are relative to the manifest file directory or absolute.
"""
from __future__ import annotations

import csv
import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterator, List, Optional, Sequence


REQUIRED = ("path", "label", "split")


@dataclass
class SampleRecord:
    path: Path
    label: int
    generator: str
    language: str
    codec: str
    duration_s: float
    sha256: str
    license: str
    split: str


def sha256_file(path: Path, chunk: int = 1 << 20) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            b = f.read(chunk)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def load_manifest(manifest_path: Path, verify_checksums: bool = False) -> List[SampleRecord]:
    manifest_path = Path(manifest_path)
    base = manifest_path.parent
    rows: List[SampleRecord] = []
    with manifest_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            for k in REQUIRED:
                if k not in row or row[k] is None or str(row[k]).strip() == "":
                    raise ValueError(f"Missing required column {k} in {manifest_path}")
            p = Path(row["path"])
            if not p.is_absolute():
                p = (base / p).resolve()
            label = int(row["label"])
            if label not in (0, 1):
                raise ValueError(f"label must be 0 or 1, got {label} for {p}")
            rec = SampleRecord(
                path=p,
                label=label,
                generator=row.get("generator", "unknown") or "unknown",
                language=row.get("language", "unknown") or "unknown",
                codec=row.get("codec", "unknown") or "unknown",
                duration_s=float(row.get("duration_s") or 0.0),
                sha256=row.get("sha256", "") or "",
                license=row.get("license", "unknown") or "unknown",
                split=str(row["split"]).strip().lower(),
            )
            if verify_checksums and rec.sha256 and p.is_file():
                dig = sha256_file(p)
                if dig.lower() != rec.sha256.lower():
                    raise ValueError(f"Checksum mismatch for {p}")
            rows.append(rec)
    return rows


def filter_split(rows: Sequence[SampleRecord], split: str) -> List[SampleRecord]:
    s = split.lower()
    return [r for r in rows if r.split == s]


def speaker_disjoint_check(rows: Sequence[SampleRecord], speaker_key: str = "generator") -> Dict[str, set]:
    """Basic leakage helper: generators per split (extend with speaker_id column later)."""
    out: Dict[str, set] = {}
    for r in rows:
        out.setdefault(r.split, set()).add(getattr(r, speaker_key))
    return out


def iter_existing(rows: Sequence[SampleRecord]) -> Iterator[SampleRecord]:
    for r in rows:
        if r.path.is_file():
            yield r


def write_template_manifest(path: Path) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(
            ["path", "label", "generator", "language", "codec", "duration_s", "sha256", "license", "split"]
        )
        w.writerow(
            [
                "human/example.wav",
                "0",
                "human",
                "en",
                "wav",
                "3.0",
                "",
                "internal-authorized",
                "train",
            ]
        )
        w.writerow(
            [
                "ai_elevenlabs/example.wav",
                "1",
                "elevenlabs",
                "en",
                "wav",
                "3.0",
                "",
                "internal-authorized",
                "val",
            ]
        )
