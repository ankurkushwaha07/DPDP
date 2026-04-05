"""
Input validation for the analysis pipeline.

Runs fast rule-based checks BEFORE queuing any LLM work.
Catches obvious gibberish, empty inputs, and malformed data
so we don't waste Gemini API quota on invalid submissions.
"""

import json
import re
import logging

logger = logging.getLogger("validator")

# Minimum thresholds
MIN_DESC_WORDS = 5
MIN_DESC_AVG_WORD_LEN = 2.5   # average word length must be > 2.5 chars
MAX_DESC_WORDS = 2000
MIN_SCHEMA_CHARS = 5
MAX_SCHEMA_CHARS = 50000
MIN_FIELD_NAME_LEN = 2        # field names must be at least 2 chars
MAX_GIBBERISH_RATIO = 0.6     # max fraction of "words" that look like gibberish


class ValidationError(Exception):
    """Raised when input fails validation. Message is shown to the user."""
    pass


def validate_inputs(product_description: str, schema_text: str) -> None:
    """
    Validate analysis inputs before queuing LLM work.

    Raises ValidationError with a user-friendly message if invalid.
    Returns None if all checks pass.
    """
    _validate_product_description(product_description)
    _validate_schema(schema_text)
    logger.info("Input validation passed")


def _validate_product_description(desc: str) -> None:
    desc = desc.strip()

    if not desc:
        raise ValidationError("Product description is required.")

    words = desc.split()

    if len(words) < MIN_DESC_WORDS:
        raise ValidationError(
            f"Product description is too short. Please provide at least {MIN_DESC_WORDS} words "
            f"describing what your product does and what data it collects."
        )

    if len(words) > MAX_DESC_WORDS:
        raise ValidationError(
            f"Product description is too long (max {MAX_DESC_WORDS} words)."
        )

    # Check average word length — gibberish tends to have very short or very long "words"
    avg_len = sum(len(w) for w in words) / len(words)
    if avg_len < MIN_DESC_AVG_WORD_LEN:
        raise ValidationError(
            "Product description doesn't appear to contain meaningful text. "
            "Please describe your product in plain English."
        )

    # Check gibberish ratio — words that are all consonants, all numbers, or random chars
    gibberish_count = sum(1 for w in words if _is_gibberish_word(w))
    if len(words) > 5 and (gibberish_count / len(words)) > MAX_GIBBERISH_RATIO:
        raise ValidationError(
            "Product description appears to contain invalid or random text. "
            "Please provide a real description of your product."
        )


def _validate_schema(schema_text: str) -> None:
    schema_text = schema_text.strip()

    if not schema_text:
        raise ValidationError("Data schema is required.")

    if len(schema_text) < MIN_SCHEMA_CHARS:
        raise ValidationError("Schema is too short. Please provide your data schema.")

    if len(schema_text) > MAX_SCHEMA_CHARS:
        raise ValidationError(
            f"Schema is too large (max {MAX_SCHEMA_CHARS} characters). "
            "Please provide a condensed version of your schema."
        )

    # Try to extract field names from JSON or plain text
    field_names = _extract_field_names(schema_text)

    if not field_names:
        raise ValidationError(
            "Could not extract any data fields from the schema. "
            "Please provide a JSON object or a list of field names."
        )

    # Check field names look real
    gibberish_fields = [f for f in field_names if _is_gibberish_word(f)]
    if len(field_names) > 0 and (len(gibberish_fields) / len(field_names)) > MAX_GIBBERISH_RATIO:
        raise ValidationError(
            "The schema field names don't appear to be real data fields "
            "(e.g. 'name', 'email', 'phone'). Please check your schema."
        )

    # Check fields are long enough to be meaningful
    too_short = [f for f in field_names if len(f) < MIN_FIELD_NAME_LEN]
    if len(field_names) > 0 and (len(too_short) / len(field_names)) > 0.7:
        raise ValidationError(
            "Schema field names are too short to be meaningful. "
            "Please use descriptive field names like 'email', 'user_id', 'phone_number'."
        )


def _extract_field_names(schema_text: str) -> list[str]:
    """
    Try to extract field names from various schema formats:
    - JSON object / nested JSON
    - Comma-separated list
    - Line-separated list
    """
    field_names = []

    # Try JSON parsing first
    try:
        parsed = json.loads(schema_text)
        field_names = _extract_from_json(parsed)
        if field_names:
            return field_names
    except (json.JSONDecodeError, ValueError):
        pass

    # Try extracting quoted strings (JSON-like but not valid)
    quoted = re.findall(r'"([^"]{1,60})"', schema_text)
    if quoted:
        return [q for q in quoted if not q.startswith("http")]

    # Try comma or newline separated
    candidates = re.split(r'[,\n;|]', schema_text)
    field_names = [c.strip().strip('"\'[]{}') for c in candidates if c.strip()]
    field_names = [f for f in field_names if 2 <= len(f) <= 60 and not f.startswith("http")]

    return field_names[:100]  # Cap at 100


def _extract_from_json(obj, depth: int = 0) -> list[str]:
    """Recursively extract all keys from a JSON object."""
    if depth > 5:
        return []
    names = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            names.append(str(k))
            names.extend(_extract_from_json(v, depth + 1))
    elif isinstance(obj, list):
        for item in obj:
            if isinstance(item, str):
                names.append(item)
            else:
                names.extend(_extract_from_json(item, depth + 1))
    return names


def _is_gibberish_word(word: str) -> bool:
    """
    Heuristic: a word is probably gibberish if it:
    - Has no vowels (e.g. 'xkqwzm')
    - Is all digits
    - Has excessive consecutive consonants (> 5)
    - Contains repeated single char (e.g. 'aaaaaaa')
    """
    word = re.sub(r'[^a-zA-Z0-9]', '', word.lower())
    if not word:
        return False
    if len(word) <= 2:
        return False  # short words like "id", "to" are fine

    # All digits
    if word.isdigit():
        return False  # numeric field names like "123" are borderline but allow

    # No vowels at all in a word longer than 4 chars
    vowels = set('aeiou')
    if len(word) > 4 and not any(c in vowels for c in word):
        return True

    # Single repeated character
    if len(set(word)) == 1:
        return True

    # More than 5 consecutive consonants
    consonant_run = re.search(r'[^aeiou]{6,}', word)
    if consonant_run:
        return True

    return False
