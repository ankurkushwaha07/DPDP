"""
Rule-based fallback for when Gemini LLM is unavailable.

Uses keyword matching to classify data fields into DPDP categories.
Less accurate than LLM (confidence=0.60) but always available.

This is the SAFETY NET — the app never returns zero results.
"""

import re
import json
import logging
from app.models.schemas import DataClassification, RiskLevel

logger = logging.getLogger("fallback")

# Keyword → category mapping
FIELD_KEYWORDS = {
    "identifiers": [
        "name", "email", "phone", "mobile", "address", "aadhaar", "aadhar",
        "pan", "passport", "voter_id", "driving_license", "user_id", "username",
        "login", "account_id", "customer_id", "member_id", "subscriber",
    ],
    "financial": [
        "bank", "account_number", "upi", "credit_card", "debit_card", "payment",
        "transaction", "invoice", "salary", "income", "billing", "wallet",
        "loan", "emi", "balance", "ifsc", "swift", "routing_number",
    ],
    "health": [
        "medical", "health", "prescription", "diagnosis", "doctor", "patient",
        "hospital", "blood", "allergy", "biometric", "fingerprint", "face_id",
        "retina", "dna", "genetic", "vaccine", "medication", "therapy",
    ],
    "children": [
        "child", "minor", "age", "school", "grade", "parent", "guardian",
        "student", "kid", "teen", "adolescent", "under_18", "dob",
        "date_of_birth", "birth_date", "minor_age", "parental",
    ],
    "sensitive": [
        "caste", "religion", "political", "sexual", "orientation", "ethnic",
        "disability", "criminal", "conviction", "tribe", "race",
    ],
    "behavioral": [
        "browsing", "history", "tracking", "location", "gps", "cookie",
        "analytics", "usage", "click", "session", "device", "ip_address",
        "latitude", "longitude", "geolocation", "beacon", "wifi",
    ],
    "communication": [
        "chat", "message", "call", "sms", "email_content", "conversation",
        "notification", "inbox", "outbox", "voicemail", "recording",
    ],
}

# Category → risk level
CATEGORY_RISK = {
    "identifiers": RiskLevel.MEDIUM,
    "financial": RiskLevel.HIGH,
    "health": RiskLevel.HIGH,
    "children": RiskLevel.HIGH,
    "sensitive": RiskLevel.HIGH,
    "behavioral": RiskLevel.MEDIUM,
    "communication": RiskLevel.MEDIUM,
}

RISK_ORDER = {RiskLevel.LOW: 1, RiskLevel.MEDIUM: 2, RiskLevel.HIGH: 3}


def classify_fields_rule_based(schema_text: str) -> list[DataClassification]:
    """
    Classify data fields using keyword matching.

    Args:
        schema_text: JSON schema string or plain text listing data fields

    Returns:
        List of DataClassification objects with confidence=0.60
    """
    fields = _extract_field_names(schema_text)

    if not fields:
        logger.warning("No fields extracted from schema text")
        return []

    classifications = []
    for field in fields:
        field_lower = field.lower().replace("-", "_").replace(" ", "_")
        categories = []

        for category, keywords in FIELD_KEYWORDS.items():
            for keyword in keywords:
                if keyword in field_lower or field_lower in keyword:
                    categories.append(category)
                    break

        if not categories:
            categories = ["identifiers"]  # Conservative default

        # Highest risk among matched categories
        risk = max(
            (CATEGORY_RISK.get(c, RiskLevel.LOW) for c in categories),
            key=lambda r: RISK_ORDER[r],
        )

        classifications.append(DataClassification(
            field_name=field,
            categories=categories,
            risk_level=risk,
            reasoning=f"Rule-based classification: matched keywords for {', '.join(categories)}",
            confidence=0.60,
        ))

    logger.info(f"Rule-based classification: {len(fields)} fields → {len(classifications)} classifications")
    return classifications


def _extract_field_names(schema_text: str) -> list[str]:
    """
    Extract field names from JSON schema or plain text.
    Handles:
    - Valid JSON objects/arrays
    - Quoted strings
    - Plain text with field-like words
    """
    fields = []

    # Try JSON parse first
    try:
        data = json.loads(schema_text)
        fields = _flatten_json_keys(data)
    except (json.JSONDecodeError, TypeError):
        # Try regex: quoted strings
        fields = re.findall(r'["\']([a-zA-Z_][a-zA-Z0-9_]*)["\']', schema_text)
        if not fields:
            # Try word extraction
            fields = re.findall(r'\b([a-zA-Z_][a-zA-Z0-9_]{2,})\b', schema_text)

    # Deduplicate preserving order, cap at 50
    seen = set()
    unique = []
    for f in fields:
        f_lower = f.lower()
        if f_lower not in seen and len(f) > 1:
            seen.add(f_lower)
            unique.append(f)

    from app.config import MAX_SCHEMA_FIELDS
    return unique[:MAX_SCHEMA_FIELDS]


def _flatten_json_keys(data, depth: int = 0) -> list[str]:
    """Recursively extract all keys and string values from nested JSON."""
    if depth > 10:  # Prevent infinite recursion
        return []

    keys = []
    if isinstance(data, dict):
        for k, v in data.items():
            keys.append(k)
            keys.extend(_flatten_json_keys(v, depth + 1))
    elif isinstance(data, list):
        for item in data:
            if isinstance(item, str):
                keys.append(item)
            elif isinstance(item, (dict, list)):
                keys.extend(_flatten_json_keys(item, depth + 1))
    return keys
