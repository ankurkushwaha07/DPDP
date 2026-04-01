"""
LLM-based data field classifier.

Uses Gemini to classify data fields into DPDP categories.
Falls back to rule-based classification if LLM fails.
All user inputs are sanitized before being sent to the LLM.
"""

import logging
from app.llm.client import call_gemini, LLMError
from app.security.sanitizer import sanitize_for_llm, wrap_user_content
from app.analysis.prompts import CLASSIFY_PROMPT
from app.analysis.fallback import classify_fields_rule_based
from app.models.schemas import DataClassification, RiskLevel
from app.config import MAX_SCHEMA_FIELDS

logger = logging.getLogger("classifier")


def classify_data_fields(schema_text: str) -> list[DataClassification]:
    """
    Classify data fields from a schema using LLM.
    Falls back to rule-based classification on failure.

    Args:
        schema_text: JSON schema or plain text describing data fields

    Returns:
        List of DataClassification objects
    """
    # Sanitize input
    clean_text = sanitize_for_llm(schema_text, "schema_text")

    if not clean_text.strip():
        logger.warning("Empty schema text after sanitization")
        return []

    # Try LLM classification
    try:
        return _classify_with_llm(clean_text)
    except LLMError as e:
        logger.warning(f"LLM classification failed, using fallback: {e}")
        return classify_fields_rule_based(schema_text)
    except Exception as e:
        logger.error(f"Unexpected error in classification: {e}", exc_info=True)
        return classify_fields_rule_based(schema_text)


def _classify_with_llm(schema_text: str) -> list[DataClassification]:
    """
    Internal: Call LLM for classification and parse results.
    Raises LLMError on failure.
    """
    # Wrap user content for injection protection
    wrapped = wrap_user_content(schema_text, "DATA_SCHEMA")

    # Build prompt
    prompt = CLASSIFY_PROMPT.format(schema_wrapped=wrapped)

    # Call LLM (uses Flash-Lite for classification — cheaper)
    result = call_gemini(prompt, expect_json=True, model="flash_lite")

    # Parse response
    return _parse_classification_response(result)


def _parse_classification_response(result: dict | list) -> list[DataClassification]:
    """
    Parse LLM classification response into DataClassification objects.
    Handles variations in response format.
    """
    # Extract classifications list
    if isinstance(result, dict):
        items = result.get("classifications", [])
    elif isinstance(result, list):
        items = result
    else:
        logger.warning(f"Unexpected response type: {type(result)}")
        return []

    classifications = []

    for item in items[:MAX_SCHEMA_FIELDS]:  # Cap at max fields
        try:
            # Normalize risk level
            risk_raw = str(item.get("risk_level", "medium")).lower()
            try:
                risk = RiskLevel(risk_raw)
            except ValueError:
                risk = RiskLevel.MEDIUM

            # Normalize confidence
            confidence = item.get("confidence", 0.80)
            if not isinstance(confidence, (int, float)):
                confidence = 0.80
            confidence = max(0.0, min(1.0, float(confidence)))

            # Normalize categories
            categories = item.get("categories", [])
            if isinstance(categories, str):
                categories = [categories]
            if not categories:
                categories = ["identifiers"]

            classifications.append(DataClassification(
                field_name=str(item.get("field_name", "unknown")),
                categories=categories,
                risk_level=risk,
                reasoning=str(item.get("reasoning", "LLM classification")),
                confidence=confidence,
            ))
        except Exception as e:
            logger.warning(f"Failed to parse classification item: {item}, error: {e}")
            continue

    logger.info(f"LLM classified {len(classifications)} fields")
    return classifications
