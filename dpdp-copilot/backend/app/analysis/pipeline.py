"""
Main analysis pipeline orchestrator.

Runs as a FastAPI background task:
1. Load input from DB
2. Classify data fields (LLM → fallback)
3. Map obligations (deterministic)
4. Gap analysis (LLM + RAG → fallback)
5. Calculate compliance score
6. Save results to DB

Updates analysis status at each step:
pending → processing → completed | failed
"""

import json
import logging
from app.db.database import get_db
from app.analysis.classifier import classify_data_fields
from app.analysis.mapper import map_obligations
from app.analysis.gap_analyzer import analyze_gaps
from app.analysis.fallback import classify_fields_rule_based
from app.llm.client import LLMError

logger = logging.getLogger("pipeline")


def run_analysis_pipeline(analysis_id: str) -> None:
    """
    Execute the full analysis pipeline for a given analysis_id.

    This function is designed to run as a background task.
    It updates the database at each step so the frontend can poll progress.
    On any failure, it saves the error and marks status as 'failed'.
    """
    try:
        # === Step 0: Load input and set status to processing ===
        with get_db() as conn:
            row = conn.execute(
                "SELECT * FROM analyses WHERE id = ?", (analysis_id,)
            ).fetchone()

            if not row:
                logger.error(f"[{analysis_id}] Analysis not found in database")
                return

            conn.execute(
                "UPDATE analyses SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (analysis_id,),
            )

        schema_text = row["input_schema"]
        policy_text = row["privacy_policy_text"] or ""
        product_desc = row["product_description"] or ""

        logger.info(f"[{analysis_id}] Starting pipeline. Schema: {len(schema_text)} chars, Policy: {len(policy_text)} chars")

        # === Step 1: Classify data fields ===
        logger.info(f"[{analysis_id}] Step 1/4: Classifying data fields")
        try:
            classifications = classify_data_fields(schema_text)
        except (LLMError, Exception) as e:
            logger.warning(f"[{analysis_id}] LLM classification failed, using fallback: {e}")
            classifications = classify_fields_rule_based(schema_text)

        if not classifications:
            raise ValueError("No data fields could be classified from the provided schema")

        # === Step 2: Map obligations (deterministic — no LLM) ===
        logger.info(f"[{analysis_id}] Step 2/4: Mapping obligations")
        categories = set()
        for c in classifications:
            cats = c.categories if hasattr(c, "categories") else c.get("categories", [])
            categories.update(cats)

        obligations = map_obligations(list(categories), product_desc)

        # === Step 3: Gap analysis (LLM + RAG) ===
        logger.info(f"[{analysis_id}] Step 3/4: Running gap analysis ({len(obligations)} obligations)")

        # Convert ObligationItem objects to dicts for gap analyzer
        obligations_dicts = [
            o.model_dump() if hasattr(o, "model_dump") else
            o.dict() if hasattr(o, "dict") else o
            for o in obligations
        ]

        try:
            gap_report = analyze_gaps(obligations_dicts, policy_text)
        except (LLMError, Exception) as e:
            logger.warning(f"[{analysis_id}] LLM gap analysis failed, using fallback: {e}")
            gap_report = _fallback_gap_report(obligations_dicts, policy_text)

        # === Step 4: Calculate compliance score ===
        logger.info(f"[{analysis_id}] Step 4/4: Calculating compliance score")
        compliance_pct, risk_score = _calculate_score(gap_report)

        # === Save results ===
        classifications_json = _serialize(classifications)
        obligations_json = _serialize(obligations)
        gap_json = json.dumps(gap_report) if isinstance(gap_report, list) else _serialize(gap_report)

        with get_db() as conn:
            conn.execute(
                """UPDATE analyses SET
                   classifications = cast(? as jsonb), obligations = cast(? as jsonb), gap_report = cast(? as jsonb),
                   overall_risk_score = ?, compliance_percentage = ?,
                   status = 'completed', updated_at = CURRENT_TIMESTAMP
                   WHERE id = ?""",
                (classifications_json, obligations_json, gap_json,
                 risk_score, compliance_pct, analysis_id),
            )

        logger.info(
            f"[{analysis_id}] Pipeline completed. "
            f"Score: {compliance_pct}%, Risk: {risk_score}, "
            f"Fields: {len(classifications)}, Obligations: {len(obligations)}, "
            f"Gaps: {len(gap_report)}"
        )

    except Exception as e:
        logger.error(f"[{analysis_id}] Pipeline failed: {e}", exc_info=True)
        try:
            with get_db() as conn:
                conn.execute(
                    "UPDATE analyses SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (str(e)[:500], analysis_id),
                )
        except Exception as db_err:
            logger.error(f"[{analysis_id}] Failed to save error status: {db_err}")


def _calculate_score(gap_report: list) -> tuple[int, str]:
    """
    Calculate compliance percentage and overall risk score.

    Returns:
        (compliance_percentage: int, risk_score: str)
    """
    if not gap_report:
        return 0, "high"

    total = len(gap_report)
    compliant = 0
    partial = 0
    critical_count = 0

    for g in gap_report:
        status = g.get("status", "missing") if isinstance(g, dict) else getattr(g, "status", "missing")
        severity = g.get("severity", "medium") if isinstance(g, dict) else getattr(g, "severity", "medium")

        if status == "compliant":
            compliant += 1
        elif status == "partial":
            partial += 1

        if severity == "critical":
            critical_count += 1

    compliance_pct = int(((compliant + partial * 0.5) / max(total, 1)) * 100)

    if critical_count >= 2 or compliance_pct < 40:
        risk_score = "high"
    elif compliance_pct < 70:
        risk_score = "medium"
    else:
        risk_score = "low"

    return compliance_pct, risk_score


def _fallback_gap_report(obligations: list, policy_text: str) -> list[dict]:
    """
    Fallback gap report when LLM is unavailable.
    If no policy: all missing. If policy exists: all partial (can't verify without LLM).
    """
    has_policy = bool(policy_text and len(policy_text.strip()) > 50)

    report = []
    for ob in obligations:
        category = ob.get("category", "unknown") if isinstance(ob, dict) else getattr(ob, "category", "unknown")
        act_sections = ob.get("act_sections", []) if isinstance(ob, dict) else getattr(ob, "act_sections", [])

        report.append({
            "obligation": category,
            "section_ref": ", ".join(act_sections),
            "status": "partial" if has_policy else "missing",
            "gap_description": (
                "AI analysis unavailable — manual review recommended"
                if has_policy
                else "No privacy policy provided"
            ),
            "recommended_action": "Review your policy against this obligation manually",
            "severity": "medium",
            "confidence": 0.40,
            "matched_dpdp_text": "",
        })

    return report


def _serialize(items) -> str:
    """Serialize a list of Pydantic models or dicts to JSON string."""
    if not items:
        return "[]"

    serialized = []
    for item in items:
        if hasattr(item, "model_dump"):
            serialized.append(item.model_dump())
        elif hasattr(item, "dict"):
            serialized.append(item.dict())
        elif isinstance(item, dict):
            serialized.append(item)
        else:
            serialized.append(str(item))

    return json.dumps(serialized)
