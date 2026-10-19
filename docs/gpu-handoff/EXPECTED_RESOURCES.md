# Expected Resources

## Laptop 1 (measured 2026-10-18)

| Item | Value |
|------|-------|
| CPU | Intel Core Ultra 7 165U (12c/14t) |
| RAM | ~31.4 GB |
| GPU | Intel(R) Graphics only (no CUDA) |
| Python | 3.12.5 |
| Node | 25.8.0 |
| sklearn live smoke latency | ~11–48 ms / synthetic fixture |

## Laptop 2 (expected)

| Item | Value |
|------|-------|
| GPU | RTX 3060 Laptop 6 GB |
| Safe VRAM budget | ≤5.5 GB peak |
| Suggested batch | 2–4 (+ grad accum 4–8) |
| Precision | FP16 AMP |

## Disk

Keep datasets outside git (`data/eval` local only). Checkpoints under `artifacts/checkpoints/` (gitignored).
