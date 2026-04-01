"""
Gemini LLM client with retry, fallback, and JSON parsing.

ALL LLM calls in the entire application MUST go through call_gemini().
Direct model.generate_content() calls are BANNED.

Features:
- 3 retries with exponential backoff
- Automatic fallback from Flash to Flash-Lite (or vice versa) on final retry
- Rate limit (429) detection with longer waits
- 3-stage JSON parsing (raw → strip fences → regex extract)
- Structured logging of all requests
"""

import google.generativeai as genai
import json
import re
import time
import logging
from typing import Union

from app.config import (
    GEMINI_API_KEY,
    GEMINI_FLASH_MODEL,
    GEMINI_FLASH_LITE_MODEL,
    LLM_MAX_RETRIES,
    LLM_RETRY_DELAY,
    LLM_TEMPERATURE,
    LLM_MAX_OUTPUT_TOKENS,
)

logger = logging.getLogger("llm_client")
llm_request_logger = logging.getLogger("llm_requests")


class LLMError(Exception):
    """Raised when LLM call fails after all retries."""
    pass


# === Model Initialization ===
# Models are initialized lazily on first call to avoid import-time errors
# when GEMINI_API_KEY is not set (e.g., during testing)

_flash_model = None
_flash_lite_model = None


def _get_models():
    """Lazy-initialize Gemini models on first use."""
    global _flash_model, _flash_lite_model

    if _flash_model is None:
        if not GEMINI_API_KEY:
            raise LLMError("GEMINI_API_KEY is not set in environment variables")
        genai.configure(api_key=GEMINI_API_KEY)
        _flash_model = genai.GenerativeModel(GEMINI_FLASH_MODEL)
        _flash_lite_model = genai.GenerativeModel(GEMINI_FLASH_LITE_MODEL)

    return _flash_model, _flash_lite_model


# === Core Call Function ===

def call_gemini(
    prompt: str,
    expect_json: bool = True,
    model: str = "flash",
    max_retries: int = LLM_MAX_RETRIES,
    retry_delay: float = LLM_RETRY_DELAY,
) -> Union[dict, list, str]:
    """
    Call Gemini with retry, fallback, and JSON validation.

    Args:
        prompt: The full prompt string
        expect_json: If True, parse response as JSON. If False, return raw text.
        model: "flash" or "flash_lite"
        max_retries: Number of retry attempts
        retry_delay: Base delay between retries (seconds)

    Returns:
        dict/list if expect_json=True (parsed JSON)
        str if expect_json=False (raw text)

    Raises:
        LLMError: When all retries are exhausted
    """
    flash_model, flash_lite_model = _get_models()

    selected_model = flash_model if model == "flash" else flash_lite_model
    fallback_model = flash_lite_model if model == "flash" else flash_model

    last_error = None
    model_name = model

    for attempt in range(max_retries):
        model_name = model
        start_time = None
        try:
            # Use fallback model on final attempt
            current_model = selected_model if attempt < max_retries - 1 else fallback_model
            model_name = "flash" if current_model is flash_model else "flash_lite"

            logger.info(f"LLM call attempt {attempt + 1}/{max_retries} using {model_name}")

            start_time = time.time()
            response = current_model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=LLM_TEMPERATURE,
                    max_output_tokens=LLM_MAX_OUTPUT_TOKENS,
                ),
            )

            elapsed_ms = int((time.time() - start_time) * 1000)
            raw_text = response.text.strip()

            # Log the request
            llm_request_logger.info(json.dumps({
                "model": model_name,
                "prompt_length": len(prompt),
                "response_length": len(raw_text),
                "latency_ms": elapsed_ms,
                "attempt": attempt + 1,
                "success": True,
            }))

            if not expect_json:
                return raw_text

            # Parse JSON
            return _parse_json_response(raw_text)

        except LLMError:
            # Re-raise JSON parse errors (don't retry parse failures from valid responses)
            raise

        except Exception as e:
            last_error = e
            elapsed_ms = (
                int((time.time() - start_time) * 1000) if start_time is not None else 0
            )

            logger.warning(f"LLM attempt {attempt + 1} failed: {type(e).__name__}: {e}")

            llm_request_logger.info(json.dumps({
                "model": model_name,
                "prompt_length": len(prompt),
                "response_length": 0,
                "latency_ms": elapsed_ms,
                "attempt": attempt + 1,
                "success": False,
                "error": str(e)[:200],
            }))

            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                wait = retry_delay * (attempt + 1) * 2
                logger.info(f"Rate limited. Waiting {wait}s...")
                time.sleep(wait)
            elif attempt < max_retries - 1:
                time.sleep(retry_delay * (attempt + 1))

    raise LLMError(f"All {max_retries} LLM attempts failed. Last error: {last_error}")


# === JSON Parsing ===

def _parse_json_response(raw_text: str) -> Union[dict, list]:
    """
    Parse JSON from LLM response. Handles common LLM quirks:
    1. Raw JSON
    2. JSON wrapped in ```json ... ``` code fences
    3. JSON with trailing commas
    4. JSON embedded in surrounding text
    """
    text = raw_text

    # Stage 1: Strip markdown code fences
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [line for line in lines if not line.strip().startswith("```")]
        text = "\n".join(lines).strip()

    # Stage 2: Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Stage 3: Remove trailing commas (common LLM mistake)
    cleaned = re.sub(r',\s*([}\]])', r'\1', text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Stage 4: Extract JSON object or array from surrounding text
    # Try object first
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    # Try array
    match = re.search(r'\[.*\]', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    raise LLMError(f"Could not parse JSON from LLM response:\n{raw_text[:500]}")
