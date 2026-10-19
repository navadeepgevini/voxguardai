"""Classification / calibration metrics (CPU-safe, numpy-only)."""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np


def confusion(y_true: Sequence[int], y_pred: Sequence[int]) -> Dict[str, int]:
    yt = np.asarray(y_true, dtype=int)
    yp = np.asarray(y_pred, dtype=int)
    return {
        "tp": int(np.sum((yt == 1) & (yp == 1))),
        "tn": int(np.sum((yt == 0) & (yp == 0))),
        "fp": int(np.sum((yt == 0) & (yp == 1))),
        "fn": int(np.sum((yt == 1) & (yp == 0))),
    }


def binary_metrics(y_true: Sequence[int], y_pred: Sequence[int]) -> Dict[str, Any]:
    c = confusion(y_true, y_pred)
    tp, tn, fp, fn = c["tp"], c["tn"], c["fp"], c["fn"]
    prec = tp / (tp + fp) if (tp + fp) else None
    rec = tp / (tp + fn) if (tp + fn) else None
    fpr = fp / (fp + tn) if (fp + tn) else None
    fnr = fn / (fn + tp) if (fn + tp) else None
    f1 = (2 * prec * rec / (prec + rec)) if prec is not None and rec is not None and (prec + rec) else None
    return {**c, "precision": prec, "recall": rec, "fpr": fpr, "fnr": fnr, "f1": f1, "n": len(y_true)}


def roc_curve_points(y_true: Sequence[int], scores: Sequence[float]) -> Tuple[np.ndarray, np.ndarray]:
    yt = np.asarray(y_true, dtype=int)
    sc = np.asarray(scores, dtype=float)
    order = np.argsort(-sc)
    yt = yt[order]
    tps = np.cumsum(yt == 1)
    fps = np.cumsum(yt == 0)
    P = max(1, int(np.sum(yt == 1)))
    N = max(1, int(np.sum(yt == 0)))
    tpr = tps / P
    fpr = fps / N
    return fpr, tpr


def auroc(y_true: Sequence[int], scores: Sequence[float]) -> Optional[float]:
    yt = np.asarray(y_true, dtype=int)
    if len(np.unique(yt)) < 2:
        return None
    fpr, tpr = roc_curve_points(y_true, scores)
    trap = getattr(np, "trapezoid", None) or getattr(np, "trapz")
    return float(trap(tpr, fpr))


def eer(y_true: Sequence[int], scores: Sequence[float]) -> Optional[float]:
    yt = np.asarray(y_true, dtype=int)
    if len(np.unique(yt)) < 2:
        return None
    fpr, tpr = roc_curve_points(y_true, scores)
    fnr = 1.0 - tpr
    idx = int(np.argmin(np.abs(fpr - fnr)))
    return float((fpr[idx] + fnr[idx]) / 2.0)


def tpr_at_fpr(y_true: Sequence[int], scores: Sequence[float], target_fpr: float = 0.01) -> Optional[float]:
    yt = np.asarray(y_true, dtype=int)
    if len(np.unique(yt)) < 2:
        return None
    fpr, tpr = roc_curve_points(y_true, scores)
    eligible = np.where(fpr <= target_fpr)[0]
    if len(eligible) == 0:
        return float(tpr[0]) if len(tpr) else None
    return float(np.max(tpr[eligible]))


def expected_calibration_error(
    y_true: Sequence[int],
    scores: Sequence[float],
    n_bins: int = 10,
) -> Optional[float]:
    yt = np.asarray(y_true, dtype=float)
    sc = np.asarray(scores, dtype=float)
    if len(yt) == 0:
        return None
    bins = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    for i in range(n_bins):
        mask = (sc >= bins[i]) & (sc < bins[i + 1] if i < n_bins - 1 else sc <= bins[i + 1])
        if not np.any(mask):
            continue
        conf = float(np.mean(sc[mask]))
        acc = float(np.mean(yt[mask]))
        ece += (np.sum(mask) / len(yt)) * abs(acc - conf)
    return float(ece)


def full_report(y_true: Sequence[int], scores: Sequence[float], threshold: float = 0.5) -> Dict[str, Any]:
    sc = np.asarray(scores, dtype=float)
    # Accept 0-100 or 0-1 scores
    if sc.max() > 1.5:
        sc01 = sc / 100.0
        thr = threshold if threshold <= 1.0 else threshold / 100.0
    else:
        sc01 = sc
        thr = threshold
    y_pred = (sc01 >= thr).astype(int).tolist()
    return {
        "threshold": thr,
        "binary": binary_metrics(y_true, y_pred),
        "auroc": auroc(y_true, sc01),
        "eer": eer(y_true, sc01),
        "tpr_at_1pct_fpr": tpr_at_fpr(y_true, sc01, 0.01),
        "tpr_at_0_1pct_fpr": tpr_at_fpr(y_true, sc01, 0.001),
        "ece": expected_calibration_error(y_true, sc01),
    }
