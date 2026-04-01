"""
Deterministic obligation mapper.

Maps data categories → DPDP obligations. NO LLM calls.
Pure if/else logic based on DPDP Act 2023 requirements.

Rules:
- consent, data_principal_rights, security_safeguards, breach_notification, data_retention
  are ALWAYS applicable (every data fiduciary must comply)
- children_data only if "children" category is present
- significant_data_fiduciary if processing large-scale financial or health data
- cross_border_transfer if product description mentions international operations
- consent_manager always recommended (though not always mandatory)
"""

import logging
from app.knowledge.section_map import OBLIGATION_CATEGORIES
from app.models.schemas import ObligationItem

logger = logging.getLogger("mapper")

# Categories that trigger the significant_data_fiduciary obligation
HIGH_VOLUME_CATEGORIES = {"financial", "health", "sensitive", "biometric"}


def map_obligations(
    data_categories: list[str],
    product_description: str = "",
) -> list[ObligationItem]:
    """
    Map classified data categories to applicable DPDP obligations.

    Args:
        data_categories: List of data category strings from classification
                         (e.g., ["identifiers", "financial", "children"])
        product_description: Optional product description for context clues

    Returns:
        List of ObligationItem objects with section references
    """
    categories_set = set(data_categories)
    obligations = []

    # === ALWAYS APPLICABLE ===

    # Consent (Section 5, 6)
    obligations.append(_make_obligation(
        "consent",
        triggered_by=list(categories_set),
    ))

    # Purpose limitation (Section 4, 7)
    obligations.append(_make_obligation(
        "purpose_limitation",
        triggered_by=list(categories_set),
    ))

    # Data Principal rights (Sections 11-14)
    obligations.append(_make_obligation(
        "data_principal_rights",
        triggered_by=list(categories_set),
    ))

    # Security safeguards (Section 8(4))
    obligations.append(_make_obligation(
        "security_safeguards",
        triggered_by=list(categories_set),
    ))

    # Breach notification (Section 8(6))
    obligations.append(_make_obligation(
        "breach_notification",
        triggered_by=list(categories_set),
    ))

    # Data retention (Section 8(7))
    obligations.append(_make_obligation(
        "data_retention",
        triggered_by=list(categories_set),
    ))

    # === CONDITIONAL ===

    # Children's data (Section 9) — only if children category present
    if "children" in categories_set:
        obligations.append(_make_obligation(
            "children_data",
            triggered_by=["children"],
        ))

    # Significant Data Fiduciary (Section 10) — if high-volume sensitive data
    if categories_set & HIGH_VOLUME_CATEGORIES:
        obligations.append(_make_obligation(
            "significant_data_fiduciary",
            triggered_by=list(categories_set & HIGH_VOLUME_CATEGORIES),
        ))

    # Cross-border transfer (Section 16) — if international keywords in description
    desc_lower = product_description.lower()
    cross_border_keywords = [
        "international", "global", "cross-border", "outside india",
        "overseas", "foreign", "cloud", "aws", "azure", "gcp",
        "us servers", "eu servers", "data transfer",
    ]
    if any(kw in desc_lower for kw in cross_border_keywords):
        obligations.append(_make_obligation(
            "cross_border_transfer",
            triggered_by=["international_operations"],
        ))

    # Consent manager — always recommended
    obligations.append(_make_obligation(
        "consent_manager",
        triggered_by=list(categories_set),
    ))

    logger.info(
        f"Mapped {len(data_categories)} categories → {len(obligations)} obligations"
    )
    return obligations


def _make_obligation(category: str, triggered_by: list[str]) -> ObligationItem:
    """Create an ObligationItem from the section map."""
    cat_data = OBLIGATION_CATEGORIES.get(category, {})

    return ObligationItem(
        category=category,
        description=cat_data.get("description", f"DPDP obligation: {category}"),
        act_sections=cat_data.get("act_sections", []),
        rules_refs=cat_data.get("rules_refs", []),
        triggered_by=triggered_by,
    )
