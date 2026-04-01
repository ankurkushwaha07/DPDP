"""Tests for pipeline helper functions."""

import sys
import json

sys.path.insert(0, ".")

from app.analysis.pipeline import _calculate_score, _fallback_gap_report, _serialize
from app.models.schemas import DataClassification, RiskLevel


def test_score_all_missing():
    gaps = [{"status": "missing", "severity": "critical"}] * 3
    pct, risk = _calculate_score(gaps)
    assert pct == 0
    assert risk == "high"


def test_score_all_compliant():
    gaps = [{"status": "compliant", "severity": "low"}] * 3
    pct, risk = _calculate_score(gaps)
    assert pct == 100
    assert risk == "low"


def test_score_mixed():
    gaps = [
        {"status": "compliant", "severity": "low"},
        {"status": "partial", "severity": "medium"},
        {"status": "missing", "severity": "high"},
        {"status": "compliant", "severity": "low"},
    ]
    pct, _ = _calculate_score(gaps)
    assert 50 <= pct <= 70


def test_score_empty():
    pct, risk = _calculate_score([])
    assert pct == 0
    assert risk == "high"


def test_fallback_no_policy():
    obs = [{"category": "consent", "act_sections": ["Section 6"]}]
    gaps = _fallback_gap_report(obs, "")
    assert len(gaps) == 1
    assert gaps[0]["status"] == "missing"
    assert gaps[0]["confidence"] == 0.40


def test_fallback_with_policy():
    obs = [{"category": "consent", "act_sections": ["Section 6"]}]
    gaps = _fallback_gap_report(obs, "We have a privacy policy " * 10)
    assert gaps[0]["status"] == "partial"


def test_serialize_pydantic():
    items = [
        DataClassification(
            field_name="email",
            categories=["identifiers"],
            risk_level=RiskLevel.MEDIUM,
            reasoning="PII",
            confidence=0.9,
        )
    ]
    result = json.loads(_serialize(items))
    assert len(result) == 1
    assert result[0]["field_name"] == "email"


def test_serialize_dicts():
    items = [{"key": "value"}]
    result = json.loads(_serialize(items))
    assert result[0]["key"] == "value"
