"""Tests for rule-based fallback classifier."""

import sys

sys.path.insert(0, ".")

from app.analysis.fallback import classify_fields_rule_based, _extract_field_names


def test_json_schema_classification():
    schema = '{"users": ["name", "email", "phone"], "payments": ["credit_card"]}'
    results = classify_fields_rule_based(schema)
    assert len(results) >= 3
    field_names = [r.field_name for r in results]
    assert "name" in field_names or "email" in field_names


def test_children_detection():
    schema = '{"students": ["name", "age", "school", "parent_email"]}'
    results = classify_fields_rule_based(schema)
    all_categories = set()
    for r in results:
        all_categories.update(r.categories)
    assert "children" in all_categories


def test_financial_high_risk():
    schema = '{"payments": ["credit_card_number", "bank_account"]}'
    results = classify_fields_rule_based(schema)
    for r in results:
        if "financial" in r.categories:
            assert r.risk_level.value == "high"


def test_empty_schema():
    results = classify_fields_rule_based("")
    assert len(results) == 0


def test_plain_text_extraction():
    text = "We collect user email, phone number, browsing history"
    results = classify_fields_rule_based(text)
    assert len(results) >= 2


def test_confidence_is_060():
    schema = '{"users": ["email"]}'
    results = classify_fields_rule_based(schema)
    for r in results:
        assert r.confidence == 0.60


def test_extract_nested_json():
    schema = '{"users": {"profile": {"name": "str"}, "prefs": ["browsing_history"]}}'
    fields = _extract_field_names(schema)
    assert len(fields) >= 2


def test_field_cap_at_50():
    fields = [f"field_{i}" for i in range(100)]
    schema = '{"data": [' + ", ".join(f'"{f}"' for f in fields) + "]}"
    results = classify_fields_rule_based(schema)
    assert len(results) <= 50
