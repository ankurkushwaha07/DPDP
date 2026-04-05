"""
Pydantic models for all API request/response contracts.
EVERY API input/output MUST use these models. No raw dicts.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Any, Optional
from enum import Enum


# ============================================================
# ENUMS
# ============================================================

class RiskLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class GapStatus(str, Enum):
    COMPLIANT = "compliant"
    PARTIAL = "partial"
    MISSING = "missing"


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class AnalysisStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class DocType(str, Enum):
    PRIVACY_NOTICE = "privacy_notice"
    CONSENT_TEXT = "consent_text"
    RETENTION_MATRIX = "retention_matrix"
    BREACH_SOP = "breach_sop"
    GAP_REPORT = "gap_report"


# ============================================================
# REQUEST MODELS
# ============================================================

class CompanyDetails(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    contact_email: str = Field(..., pattern=r'^[\w\.\-\+]+@[\w\.\-]+\.\w+$')
    dpo_name: Optional[str] = Field(None, max_length=100)
    grievance_email: Optional[str] = Field(None, pattern=r'^[\w\.\-\+]+@[\w\.\-]+\.\w+$')


class AnalyzeRequest(BaseModel):
    product_description: str = Field(..., min_length=20, max_length=10000)
    schema_text: str = Field(..., min_length=5, max_length=50000)
    privacy_policy_text: Optional[str] = Field(None, max_length=100000)
    company_details: CompanyDetails
    parent_analysis_id: Optional[str] = Field(
        None,
        description="Link to previous analysis version for versioning"
    )

    @field_validator("product_description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        if len(v.split()) < 5:
            raise ValueError("Product description must be at least 5 words")
        return v


class GenerateRequest(BaseModel):
    analysis_id: str = Field(..., min_length=1)
    document_types: list[DocType] = Field(..., min_length=1)


# ============================================================
# DATA MODELS (used in responses and internal processing)
# ============================================================

class DataClassification(BaseModel):
    field_name: str
    categories: list[str]
    risk_level: RiskLevel
    reasoning: str
    confidence: float = Field(..., ge=0.0, le=1.0)


class ObligationItem(BaseModel):
    category: str
    description: str
    act_sections: list[str]
    rules_refs: list[str]
    triggered_by: list[str]


class GapItem(BaseModel):
    obligation: str
    section_ref: str
    status: GapStatus
    gap_description: str
    recommended_action: str
    severity: Severity
    confidence: float = Field(..., ge=0.0, le=1.0)
    matched_dpdp_text: str = ""


class AnalysisResult(BaseModel):
    data_classifications: list[DataClassification]
    applicable_obligations: list[ObligationItem]
    gap_report: list[GapItem]
    overall_risk_score: RiskLevel
    compliance_percentage: int = Field(..., ge=0, le=100)


# ============================================================
# RESPONSE MODELS
# ============================================================

class AnalyzeResponse(BaseModel):
    analysis_id: str
    status: AnalysisStatus
    poll_url: str


class StatusResponse(BaseModel):
    analysis_id: str
    status: AnalysisStatus
    step: Optional[str] = None
    progress_percent: Optional[int] = None
    result: Optional[AnalysisResult] = None
    error: Optional[str] = None
    partial_result: Optional[dict] = None


class DocumentItem(BaseModel):
    doc_type: DocType
    markdown_preview: str
    download_url: str


class GenerateResponse(BaseModel):
    documents: list[DocumentItem]


class HistoryItem(BaseModel):
    analysis_id: str
    company_name: Optional[str] = None
    risk_score: RiskLevel
    compliance_percentage: int
    version: int
    created_at: str


class HistoryResponse(BaseModel):
    analyses: list[HistoryItem]


class HealthResponse(BaseModel):
    status: str
    chroma: dict
    version: str
