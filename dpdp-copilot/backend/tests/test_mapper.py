"""Tests for deterministic obligation mapper."""

import sys

sys.path.insert(0, ".")

from app.analysis.mapper import map_obligations


def test_basic_identifiers():
    obs = map_obligations(["identifiers"])
    categories = [o.category for o in obs]
    assert "consent" in categories
    assert "data_principal_rights" in categories
    assert "security_safeguards" in categories
    assert "breach_notification" in categories


def test_children_triggers_section9():
    obs = map_obligations(["identifiers", "children"])
    categories = [o.category for o in obs]
    assert "children_data" in categories
    child_ob = [o for o in obs if o.category == "children_data"][0]
    assert "Section 9" in child_ob.act_sections


def test_financial_triggers_sdf():
    obs = map_obligations(["identifiers", "financial"])
    categories = [o.category for o in obs]
    assert "significant_data_fiduciary" in categories


def test_no_children_without_children_data():
    obs = map_obligations(["identifiers", "behavioral"])
    categories = [o.category for o in obs]
    assert "children_data" not in categories


def test_cross_border_from_description():
    obs = map_obligations(["identifiers"], "We use AWS cloud servers")
    categories = [o.category for o in obs]
    assert "cross_border_transfer" in categories


def test_no_cross_border_default():
    obs = map_obligations(["identifiers"], "Simple Indian app")
    categories = [o.category for o in obs]
    assert "cross_border_transfer" not in categories


def test_all_obligations_have_references():
    obs = map_obligations(["identifiers", "financial", "children", "health"])
    for o in obs:
        assert len(o.act_sections) >= 1 or len(o.rules_refs) >= 1
        assert o.description


def test_full_category_set():
    obs = map_obligations(
        ["identifiers", "financial", "health", "children", "sensitive", "behavioral"]
    )
    assert len(obs) >= 9
