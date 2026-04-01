"""
Document generation orchestrator.

Takes a completed analysis and generates compliance documents:
1. Renders Jinja2 templates with analysis data
2. Converts markdown to DOCX using doc_builder
3. Saves document records to database
"""

import json
import os
import uuid
import logging
from datetime import date
from jinja2 import Environment, FileSystemLoader

from app.config import GENERATED_DIR
from app.db.database import get_db
from app.generation.doc_builder import markdown_to_docx
from app.models.schemas import DocumentItem, DocType

logger = logging.getLogger("generator")

# Template directory
_TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "templates")
_env = Environment(loader=FileSystemLoader(_TEMPLATE_DIR))


def generate_documents(
    analysis_id: str,
    document_types: list,
    analysis_row: dict = None,
) -> list[DocumentItem]:
    """
    Generate compliance documents for a completed analysis.

    Args:
        analysis_id: UUID of the completed analysis
        document_types: List of DocType enums or strings
        analysis_row: Optional pre-fetched analysis DB row

    Returns:
        List of DocumentItem with markdown preview and download URL
    """
    # Load analysis data if not provided
    if analysis_row is None:
        with get_db() as conn:
            row = conn.execute(
                "SELECT * FROM analyses WHERE id = ?", (analysis_id,)
            ).fetchone()
            if not row:
                raise ValueError(f"Analysis {analysis_id} not found")
            analysis_row = dict(row)

    # Parse stored JSON fields
    classifications = json.loads(analysis_row.get("classifications", "[]"))
    obligations = json.loads(analysis_row.get("obligations", "[]"))
    gap_report = json.loads(analysis_row.get("gap_report", "[]"))

    # Build template context
    context = _build_context(analysis_row, classifications, obligations, gap_report)

    documents = []

    for doc_type in document_types:
        dt_value = doc_type.value if hasattr(doc_type, "value") else str(doc_type)

        try:
            # Render template
            markdown = _render_template(dt_value, context)

            # Generate DOCX
            doc_id = str(uuid.uuid4())
            docx_filename = f"{dt_value}_{analysis_id[:8]}.docx"
            docx_path = os.path.join(GENERATED_DIR, docx_filename)

            markdown_to_docx(
                markdown,
                docx_path,
                title=dt_value.replace("_", " ").title(),
            )

            # Save to database
            with get_db() as conn:
                conn.execute(
                    """INSERT INTO documents (id, analysis_id, doc_type, markdown_content, file_path)
                       VALUES (?, ?, ?, ?, ?)""",
                    (doc_id, analysis_id, dt_value, markdown, docx_path),
                )

            documents.append(DocumentItem(
                doc_type=DocType(dt_value),
                markdown_preview=markdown[:2000],  # First 2000 chars for preview
                download_url=f"/api/download/{doc_id}",
            ))

            logger.info(f"Generated {dt_value} for analysis {analysis_id[:8]}")

        except Exception as e:
            logger.error(f"Failed to generate {dt_value}: {e}", exc_info=True)
            # Still add to response with error note
            documents.append(DocumentItem(
                doc_type=DocType(dt_value),
                markdown_preview=f"# {dt_value.replace('_', ' ').title()}\n\n*Error generating document: {str(e)[:100]}*",
                download_url="",
            ))

    return documents


def _build_context(row: dict, classifications: list, obligations: list, gap_report: list) -> dict:
    """Build the template rendering context from analysis data."""
    # Group classifications by category
    data_categories = {}
    for c in classifications:
        for cat in (c.get("categories", []) if isinstance(c, dict) else []):
            if cat not in data_categories:
                data_categories[cat] = []
            data_categories[cat].append(c)

    # Check for special data types
    all_categories = set()
    for c in classifications:
        cats = c.get("categories", []) if isinstance(c, dict) else []
        all_categories.update(cats)

    # Build purposes from obligations
    purposes = []
    for ob in obligations:
        desc = ob.get("description", "") if isinstance(ob, dict) else ""
        if desc:
            purposes.append(desc)

    # Count gap statuses
    compliant_count = sum(1 for g in gap_report if g.get("status") == "compliant")
    partial_count = sum(1 for g in gap_report if g.get("status") == "partial")
    missing_count = sum(1 for g in gap_report if g.get("status") == "missing")
    critical_count = sum(1 for g in gap_report if g.get("severity") == "critical")

    # Data fields summary
    field_names = [c.get("field_name", "") for c in classifications if isinstance(c, dict)]
    data_fields_summary = ", ".join(field_names[:10])
    if len(field_names) > 10:
        data_fields_summary += f", and {len(field_names) - 10} more"

    return {
        "company_name": row.get("company_name", "Your Company"),
        "contact_email": row.get("company_email", "contact@company.com"),
        "dpo_name": row.get("dpo_name", ""),
        "grievance_email": row.get("grievance_email", row.get("company_email", "")),
        "current_date": date.today().isoformat(),
        "data_categories": data_categories,
        "data_classifications": classifications,
        "purposes": purposes if purposes else ["Provide and improve our services"],
        "primary_purpose": purposes[0] if purposes else "Provide our services",
        "has_children_data": "children" in all_categories,
        "has_cross_border": any(
            ob.get("category") == "cross_border_transfer"
            for ob in obligations
            if isinstance(ob, dict)
        ),
        "applicable_obligations": obligations,
        "gap_report": gap_report,
        "compliance_percentage": row.get("compliance_percentage", 0),
        "overall_risk_score": row.get("overall_risk_score", "high"),
        "total_fields": len(classifications),
        "total_categories": len(all_categories),
        "total_obligations": len(obligations),
        "compliant_count": compliant_count,
        "partial_count": partial_count,
        "missing_count": missing_count,
        "critical_count": critical_count,
        "data_fields_summary": data_fields_summary,
        "notification_method": "email or in-app notification",
        # Default retention periods
        "retention_periods": {
            "identifiers": "Account lifetime + 6 months",
            "financial": "As per tax/financial regulations (typically 7 years)",
            "health": "As per applicable health regulations",
            "children": "Until child turns 18 or account closure",
            "behavioral": "12 months from collection",
            "communication": "6 months or as required by law",
            "sensitive": "As per purpose + 3 months",
        },
        "legal_bases": {
            "identifiers": "Consent (Section 6)",
            "financial": "Consent + Legal obligation (Section 7)",
            "health": "Consent + Medical emergency (Section 7)",
            "children": "Parental consent (Section 9)",
            "behavioral": "Consent (Section 6)",
            "communication": "Consent (Section 6)",
            "sensitive": "Explicit consent (Section 6)",
        },
        "deletion_triggers": {
            "identifiers": "Account deletion / Consent withdrawal",
            "financial": "Regulatory retention period expiry",
            "health": "Treatment completion / Consent withdrawal",
            "children": "Age 18 / Account closure / Guardian request",
            "behavioral": "12-month auto-purge / Consent withdrawal",
            "communication": "6-month auto-purge / Consent withdrawal",
            "sensitive": "Purpose fulfilled / Consent withdrawal",
        },
    }


def _render_template(doc_type: str, context: dict) -> str:
    """Render a Jinja2 template with the given context."""
    template_name = f"{doc_type}.jinja2"
    try:
        template = _env.get_template(template_name)
        return template.render(**context)
    except Exception as e:
        logger.error(f"Template rendering failed for {template_name}: {e}")
        raise
