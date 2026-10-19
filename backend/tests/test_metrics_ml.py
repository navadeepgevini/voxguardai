"""Metrics + detector interface smoke tests."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from ml.metrics import auroc, binary_metrics, eer, full_report, tpr_at_fpr
from engines.detector_interface import SklearnAasistDetector, create_detector


def test_perfect_separator_metrics():
    y = [0, 0, 0, 1, 1, 1]
    scores = [0.1, 0.2, 0.15, 0.9, 0.85, 0.95]
    m = binary_metrics(y, [0, 0, 0, 1, 1, 1])
    assert m["precision"] == 1.0
    assert m["recall"] == 1.0
    assert m["fpr"] == 0.0
    assert auroc(y, scores) is not None and auroc(y, scores) > 0.9
    assert eer(y, scores) is not None
    assert tpr_at_fpr(y, scores, 0.01) is not None


def test_full_report_accepts_percent_scores():
    y = [0, 0, 1, 1]
    scores = [10, 20, 80, 90]
    r = full_report(y, scores, threshold=50)
    assert r["binary"]["tp"] == 2
    assert r["binary"]["tn"] == 2


def test_create_detector_sklearn():
    d = create_detector("sklearn")
    assert isinstance(d, SklearnAasistDetector)
    assert d.device == "cpu"
