"""
Demo scenario caching system.

When users submit the exact same inputs for demo scenarios (ecommerce, edtech, healthtech),
we serve pre-generated and cached results instead of rerunning analysis.

This saves compute costs while maintaining UX perception with artificial delay.
"""

import json
import logging
from typing import Optional

logger = logging.getLogger("demo_cache")


# === Demo Input Definitions ===
# These must match the DEMO_INPUTS in frontend/app/analyze/page.tsx exactly

DEMO_INPUTS = {
    "ecommerce": {
        "product_description": "ShopEasy is an Indian e-commerce platform that enables customers to browse, purchase, and track products. It collects personal, financial, and behavioral data to process orders, enable payments, and personalise the shopping experience.",
        "schema_text": json.dumps({
            "users": ["name", "email", "phone", "address", "date_of_birth"],
            "payments": ["credit_card_number", "upi_id", "bank_account", "transaction_history"],
            "behaviour": ["browsing_history", "search_queries", "wishlist", "purchase_history"],
            "marketing": ["device_id", "ip_address", "location"]
        }, indent=2),
        "privacy_policy_text": "ShopEasy collects personal information including name, email, phone and address for order fulfillment. Payment data is collected for transaction processing. We may share data with delivery partners. Users can contact support@shopeasy.in for queries.",
        "company_details": {
            "name": "ShopEasy Pvt Ltd",
            "contact_email": "privacy@shopeasy.in",
            "dpo_name": "Rahul Sharma",
            "grievance_email": "grievance@shopeasy.in"
        }
    },
    "edtech": {
        "product_description": "LearnBharat is a K-12 online learning platform serving students aged 6-18 across India. It collects student profiles, academic performance, and learning behaviour data to personalise education and report progress to parents.",
        "schema_text": json.dumps({
            "students": ["name", "age", "grade", "school_name", "parent_name", "parent_email", "parent_phone"],
            "academic": ["test_scores", "assignment_grades", "attendance", "learning_pace", "subject_performance"],
            "behaviour": ["video_watch_time", "quiz_attempts", "login_frequency", "device_used"],
            "content": ["preferred_subjects", "difficulty_level", "completed_courses"]
        }, indent=2),
        "privacy_policy_text": "LearnBharat collects student information to provide personalised learning. We collect name, age, grade and academic performance data. Parent contact details are collected for progress reports. Data is stored securely and not shared with third parties.",
        "company_details": {
            "name": "LearnBharat EdTech Pvt Ltd",
            "contact_email": "privacy@learnbharat.in",
            "dpo_name": "Priya Menon",
            "grievance_email": "grievance@learnbharat.in"
        }
    },
    "healthtech": {
        "product_description": "MedConnect is a telemedicine platform connecting patients with doctors across India. It handles medical records, prescriptions, health vitals, Aadhaar-based identity verification, and biometric data for authentication.",
        "schema_text": json.dumps({
            "patients": ["name", "aadhaar_number", "date_of_birth", "gender", "blood_group", "emergency_contact"],
            "medical": ["medical_history", "current_medications", "allergies", "diagnoses", "lab_reports", "prescriptions"],
            "biometric": ["fingerprint_hash", "face_id", "voice_signature"],
            "vitals": ["blood_pressure", "blood_sugar", "heart_rate", "weight", "bmi"],
            "telemedicine": ["consultation_recordings", "chat_transcripts", "doctor_notes"]
        }, indent=2),
        "privacy_policy_text": "MedConnect collects personal and health information to facilitate telemedicine consultations. We collect Aadhaar for identity verification, medical history for treatment, and biometric data for authentication. Health data is encrypted and accessible only to treating physicians.",
        "company_details": {
            "name": "MedConnect Health Pvt Ltd",
            "contact_email": "privacy@medconnect.in",
            "dpo_name": "Dr. Anita Rao",
            "grievance_email": "grievance@medconnect.in"
        }
    }
}


def detect_demo_scenario(
    product_description: str,
    schema_text: str,
    privacy_policy_text: str,
    company_details: dict,
) -> Optional[str]:
    """
    Detect if the submitted inputs exactly match a demo scenario.

    Returns scenario name (ecommerce, edtech, healthtech) or None if no match.
    """
    for scenario, demo_inputs in DEMO_INPUTS.items():
        if _inputs_match(
            product_description,
            schema_text,
            privacy_policy_text,
            company_details,
            demo_inputs
        ):
            return scenario
    return None


def _inputs_match(submitted_desc: str, submitted_schema: str, submitted_policy: str, submitted_company: dict, demo_inputs: dict) -> bool:
    """Check if all inputs match exactly."""
    # Compare descriptions
    if submitted_desc.strip() != demo_inputs["product_description"].strip():
        return False

    # Compare schema (normalize JSON to handle whitespace differences)
    try:
        submitted_schema_obj = json.loads(submitted_schema)
        demo_schema_obj = json.loads(demo_inputs["schema_text"])
        if submitted_schema_obj != demo_schema_obj:
            return False
    except (json.JSONDecodeError, TypeError):
        # If either schema fails to parse as JSON, do string comparison
        if submitted_schema.strip() != demo_inputs["schema_text"].strip():
            return False

    # Compare privacy policy
    if submitted_policy.strip() != demo_inputs["privacy_policy_text"].strip():
        return False

    # Compare company details
    demo_company = demo_inputs["company_details"]
    def _s(v) -> str:
        return (v or "").strip()

    if (_s(submitted_company.get("name")) != _s(demo_company["name"]) or
        _s(submitted_company.get("contact_email")) != _s(demo_company["contact_email"]) or
        _s(submitted_company.get("dpo_name")) != _s(demo_company["dpo_name"]) or
        _s(submitted_company.get("grievance_email")) != _s(demo_company["grievance_email"])):
        return False

    return True


def get_cached_demo_analysis_id(scenario: str) -> Optional[str]:
    """
    Get the cached analysis_id for a demo scenario from the database.

    Returns the analysis_id or None if not cached yet.
    """
    from app.db.database import get_db

    demo_marker = f"cached-demo-{scenario}"
    with get_db() as conn:
        row = conn.execute(
            "SELECT id FROM analyses WHERE id = ?",
            (demo_marker,)
        ).fetchone()

    return row["id"] if row else None


def has_cached_demo(scenario: str) -> bool:
    """Check if demo scenario results are cached in the database."""
    return get_cached_demo_analysis_id(scenario) is not None


def mark_demo_cached(scenario: str, analysis_id: str) -> None:
    """
    Mark a demo scenario as cached by creating an alias record.

    This allows fast lookup when the user submits demo inputs again.
    """
    from app.db.database import get_db

    demo_marker = f"cached-demo-{scenario}"
    with get_db() as conn:
        # Copy the analysis row with special ID for caching
        original = conn.execute(
            "SELECT * FROM analyses WHERE id = ?", (analysis_id,)
        ).fetchone()

        if original:
            conn.execute(
                """INSERT INTO analyses
                   (id, session_id, version, parent_id, product_description, input_schema,
                    privacy_policy_text, company_name, company_email, dpo_name, grievance_email,
                    classifications, obligations, gap_report, overall_risk_score, compliance_percentage, status)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT (id) DO UPDATE SET
                   classifications = EXCLUDED.classifications,
                   obligations = EXCLUDED.obligations,
                   gap_report = EXCLUDED.gap_report,
                   overall_risk_score = EXCLUDED.overall_risk_score,
                   compliance_percentage = EXCLUDED.compliance_percentage,
                   status = EXCLUDED.status""",
                (
                    demo_marker,
                    original["session_id"],
                    original["version"],
                    original["parent_id"],
                    original["product_description"],
                    original["input_schema"],
                    original["privacy_policy_text"],
                    original["company_name"],
                    original["company_email"],
                    original["dpo_name"],
                    original["grievance_email"],
                    original["classifications"],
                    original["obligations"],
                    original["gap_report"],
                    original["overall_risk_score"],
                    original["compliance_percentage"],
                    original["status"],
                )
            )
            logger.info(f"Marked demo scenario '{scenario}' as cached with ID: {demo_marker}")
