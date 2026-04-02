"""
FastAPI application — DPDP Compliance Copilot.

Endpoints:
  POST   /api/analyze              — Start async analysis
  GET    /api/analyze/{id}/status  — Poll analysis status
  POST   /api/generate             — Generate compliance documents
  GET    /api/download/{doc_id}    — Download generated DOCX
  GET    /api/demo/{scenario}      — Pre-computed demo results
  GET    /api/history              — Past analyses for this session
  GET    /api/health               — System health check
"""

import json
import os
import uuid
import logging
from fastapi import FastAPI, BackgroundTasks, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.models.schemas import (
    AnalyzeRequest, AnalyzeResponse, AnalysisStatus,
    GenerateRequest, GenerateResponse, HistoryResponse, HistoryItem,
    HealthResponse, RiskLevel,
)
from app.db.database import init_db, get_db
from app.analysis.pipeline import run_analysis_pipeline
from app.config import (
    MAX_ANALYSES_PER_IP_PER_HOUR, FRONTEND_URL, LOG_LEVEL, LOG_DIR,
    SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE, ENVIRONMENT,
)

# === Logging Setup ===

os.makedirs(LOG_DIR, exist_ok=True)

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler(os.path.join(LOG_DIR, "app.log"), encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger("main")

# === App Setup ===

app = FastAPI(
    title="DPDP Compliance Copilot",
    version="1.0.0",
    description="AI-powered DPDP Act 2023 compliance analysis for Indian SaaS",
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        FRONTEND_URL,
    ],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": f"Rate limit exceeded. Max {MAX_ANALYSES_PER_IP_PER_HOUR} analyses per hour."},
    )


@app.on_event("startup")
async def startup():
    init_db()
    os.makedirs("data/uploads", exist_ok=True)
    os.makedirs("data/generated", exist_ok=True)
    logger.info("DPDP Compliance Copilot started")


# === Session Management ===

def get_or_create_session(request: Request) -> str:
    """Get session_id from cookie or create a new one."""
    session_id = request.cookies.get(SESSION_COOKIE_NAME)

    if session_id:
        with get_db() as conn:
            existing = conn.execute("SELECT id FROM sessions WHERE id = ?", (session_id,)).fetchone()
            if existing:
                conn.execute(
                    "UPDATE sessions SET last_seen_at = datetime('now') WHERE id = ?",
                    (session_id,),
                )
                return session_id

    # Create new session
    session_id = str(uuid.uuid4())
    with get_db() as conn:
        conn.execute("INSERT INTO sessions (id) VALUES (?)", (session_id,))
    return session_id


def _set_session_cookie(response: JSONResponse, session_id: str) -> JSONResponse:
    """Set session cookie on response."""
    response.set_cookie(
        SESSION_COOKIE_NAME,
        session_id,
        max_age=SESSION_COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
    )
    return response


# === Core Endpoints ===

@app.post("/api/analyze")
@limiter.limit(f"{MAX_ANALYSES_PER_IP_PER_HOUR}/hour")
async def analyze(request: Request, body: AnalyzeRequest, background_tasks: BackgroundTasks):
    """Start async analysis. Returns immediately with analysis_id for polling."""
    analysis_id = str(uuid.uuid4())
    session_id = get_or_create_session(request)

    # Determine version
    version = 1
    parent_id = body.parent_analysis_id
    if parent_id:
        with get_db() as conn:
            prev = conn.execute("SELECT version FROM analyses WHERE id = ?", (parent_id,)).fetchone()
            if prev:
                version = prev["version"] + 1

    # Create pending record
    with get_db() as conn:
        conn.execute(
            """INSERT INTO analyses
               (id, session_id, version, parent_id,
                product_description, input_schema, privacy_policy_text,
                company_name, company_email, dpo_name, grievance_email,
                classifications, obligations, gap_report,
                overall_risk_score, compliance_percentage, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]', '[]', 'low', 0, 'pending')""",
            (
                analysis_id, session_id, version, parent_id,
                body.product_description, body.schema_text,
                body.privacy_policy_text,
                body.company_details.name, body.company_details.contact_email,
                body.company_details.dpo_name, body.company_details.grievance_email,
            ),
        )

    # Run in background
    background_tasks.add_task(run_analysis_pipeline, analysis_id)

    response_data = AnalyzeResponse(
        analysis_id=analysis_id,
        status=AnalysisStatus.PROCESSING,
        poll_url=f"/api/analyze/{analysis_id}/status",
    )

    response = JSONResponse(content=response_data.model_dump(), status_code=202)
    return _set_session_cookie(response, session_id)


@app.get("/api/analyze/{analysis_id}/status")
async def get_status(analysis_id: str):
    """Poll analysis status. Returns result when completed."""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM analyses WHERE id = ?", (analysis_id,)).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Analysis not found")

    status = row["status"]

    response = {
        "analysis_id": analysis_id,
        "status": status,
    }

    if status == "completed":
        response["result"] = {
            "data_classifications": json.loads(row["classifications"]),
            "applicable_obligations": json.loads(row["obligations"]),
            "gap_report": json.loads(row["gap_report"]),
            "overall_risk_score": row["overall_risk_score"],
            "compliance_percentage": row["compliance_percentage"],
        }
        
        response["inputs"] = {
            "product_description": row["product_description"],
            "schema_text": row["input_schema"],
            "privacy_policy_text": row["privacy_policy_text"],
            "company_details": {
                "name": row["company_name"] or "",
                "contact_email": row["company_email"] or "",
                "dpo_name": row["dpo_name"] or "",
                "grievance_email": row["grievance_email"] or "",
            }
        }
        
        with get_db() as conn:
            docs = conn.execute(
                "SELECT id, doc_type, markdown_content FROM documents WHERE analysis_id = ?",
                (analysis_id,)
            ).fetchall()
            
        if docs:
            response["documents"] = [
                {
                    "doc_type": d["doc_type"],
                    "markdown_preview": d["markdown_content"],
                    "download_url": f"/api/download/{d['id']}"
                }
                for d in docs
            ]
            
    elif status == "failed":
        response["error"] = row["error_message"] or "Analysis failed. Please try again."
    elif status == "processing":
        response["step"] = "analyzing"
        response["progress_percent"] = 50

    return response


@app.get("/api/health")
async def health():
    """System health check including ChromaDB status."""
    from app.knowledge.maintenance import health_check, get_collection_stats

    chroma_ok = health_check()
    stats = get_collection_stats() if chroma_ok else {"error": "ChromaDB unavailable"}

    return HealthResponse(
        status="healthy" if chroma_ok else "degraded",
        chroma=stats,
        version="1.0.0",
    )


@app.get("/api/history")
async def get_history(request: Request):
    """Return all past analyses (demo mode: bypass session if local)."""
    if ENVIRONMENT == "local":
        with get_db() as conn:
            rows = conn.execute(
                """SELECT id, company_name, overall_risk_score, compliance_percentage,
                          version, status, created_at
                   FROM analyses
                   WHERE status = 'completed'
                   ORDER BY created_at DESC
                   LIMIT 50"""
            ).fetchall()
    else:
        session_id = request.cookies.get(SESSION_COOKIE_NAME)
        if not session_id:
            return HistoryResponse(analyses=[])

        with get_db() as conn:
            rows = conn.execute(
                """SELECT id, company_name, overall_risk_score, compliance_percentage,
                          version, status, created_at
                   FROM analyses
                   WHERE session_id = ? AND status = 'completed'
                   ORDER BY created_at DESC
                   LIMIT 20""",
                (session_id,),
            ).fetchall()

    analyses = [
        HistoryItem(
            analysis_id=r["id"],
            company_name=r["company_name"],
            risk_score=RiskLevel(r["overall_risk_score"]),
            compliance_percentage=r["compliance_percentage"],
            version=r["version"],
            created_at=r["created_at"],
        )
        for r in rows
    ]

    return HistoryResponse(analyses=analyses)


# === Generate, Download, Demo (MP-19) ===

@app.post("/api/generate")
async def generate(body: GenerateRequest):
    """Generate compliance documents from a completed analysis."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM analyses WHERE id = ?", (body.analysis_id,)
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Analysis not found")
    if row["status"] != "completed":
        raise HTTPException(status_code=400, detail="Analysis not yet completed")

    try:
        from app.generation.generator import generate_documents
        documents = generate_documents(body.analysis_id, body.document_types, dict(row))
        return GenerateResponse(documents=documents)
    except ImportError:
        # Generator not yet built — return stub
        from app.models.schemas import DocumentItem, DocType
        stub_docs = []
        for dt in body.document_types:
            stub_docs.append(DocumentItem(
                doc_type=dt,
                markdown_preview=f"# {dt.value.replace('_', ' ').title()}\n\n*Document generation coming in MP-21/22.*",
                download_url=f"/api/download/stub-{dt.value}",
            ))
        return GenerateResponse(documents=stub_docs)


@app.get("/api/download/{doc_id}")
async def download(doc_id: str):
    """Download a generated DOCX document."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM documents WHERE id = ?", (doc_id,)
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = row["file_path"]
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Document file not found on disk")

    filename = f"{row['doc_type']}.docx"
    return FileResponse(
        file_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=filename,
    )


@app.get("/api/demo/{scenario}")
async def demo(scenario: str):
    """
    Return pre-computed demo results. No LLM calls required.
    Scenarios: ecommerce, edtech, healthtech
    """
    try:
        from app.demo.scenarios import get_demo_result
        result = get_demo_result(scenario)
        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"Unknown demo scenario: '{scenario}'. Available: ecommerce, edtech, healthtech",
            )
        return result
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Demo scenarios not yet configured. Run MP-20 first.",
        )
