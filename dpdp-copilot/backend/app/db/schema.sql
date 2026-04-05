-- Sessions: lightweight cookie-based tracking (no auth)
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Analyses: stores input, output, and status of each compliance analysis
CREATE TABLE IF NOT EXISTS analyses (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    parent_id TEXT,
    product_description TEXT NOT NULL,
    input_schema TEXT NOT NULL,
    privacy_policy_text TEXT,
    company_name TEXT,
    company_email TEXT,
    dpo_name TEXT,
    grievance_email TEXT,
    classifications JSONB NOT NULL DEFAULT '[]'::jsonb,
    obligations JSONB NOT NULL DEFAULT '[]'::jsonb,
    gap_report JSONB NOT NULL DEFAULT '[]'::jsonb,
    overall_risk_score TEXT NOT NULL DEFAULT 'low',
    compliance_percentage INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

-- Documents: generated compliance documents linked to an analysis
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    analysis_id TEXT NOT NULL,
    doc_type TEXT NOT NULL,
    markdown_content TEXT NOT NULL,
    file_path TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);
CREATE INDEX IF NOT EXISTS idx_analyses_session ON analyses(session_id);
CREATE INDEX IF NOT EXISTS idx_documents_analysis_id ON documents(analysis_id);
