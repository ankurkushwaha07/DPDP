const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ============================================================
// TYPES
// ============================================================

export interface CompanyDetails {
  name: string;
  contact_email: string;
  dpo_name?: string;
  grievance_email?: string;
}

export interface AnalyzeRequestBody {
  product_description: string;
  schema_text: string;
  privacy_policy_text?: string;
  company_details: CompanyDetails;
  parent_analysis_id?: string;
}

export interface DataClassification {
  field_name: string;
  categories: string[];
  risk_level: "high" | "medium" | "low";
  reasoning: string;
  confidence: number;
}

export interface ObligationItem {
  category: string;
  description: string;
  act_sections: string[];
  rules_refs: string[];
  triggered_by: string[];
}

export interface GapItem {
  obligation: string;
  section_ref: string;
  status: "compliant" | "partial" | "missing";
  gap_description: string;
  recommended_action: string;
  severity: "critical" | "high" | "medium" | "low";
  confidence: number;
  matched_dpdp_text: string;
}

export interface AnalysisResult {
  data_classifications: DataClassification[];
  applicable_obligations: ObligationItem[];
  gap_report: GapItem[];
  overall_risk_score: "high" | "medium" | "low";
  compliance_percentage: number;
}

export interface StatusResponse {
  analysis_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  step?: string;
  progress_percent?: number;
  result?: AnalysisResult;
  error?: string;
}

export interface DocumentItem {
  doc_type: string;
  markdown_preview: string;
  download_url: string;
}

export interface HistoryItem {
  analysis_id: string;
  company_name: string | null;
  risk_score: "high" | "medium" | "low";
  compliance_percentage: number;
  version: number;
  created_at: string;
}

// ============================================================
// API FUNCTIONS
// ============================================================

export async function startAnalysis(
  body: AnalyzeRequestBody,
): Promise<{ analysis_id: string; poll_url: string }> {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Analysis failed: ${res.status}`);
  }

  return res.json();
}

export async function pollAnalysis(
  analysisId: string,
  onProgress?: (status: StatusResponse) => void,
  maxAttempts: number = 60,
  initialIntervalMs: number = 1000,
): Promise<AnalysisResult> {
  let attempt = 0;
  let interval = initialIntervalMs;

  while (attempt < maxAttempts) {
    const res = await fetch(`${API_BASE}/api/analyze/${analysisId}/status`, {
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error(`Status check failed: ${res.status}`);
    }

    const status: StatusResponse = await res.json();

    if (onProgress) {
      onProgress(status);
    }

    if (status.status === "completed" && status.result) {
      return status.result;
    }

    if (status.status === "failed") {
      throw new Error(status.error || "Analysis failed");
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
    interval = Math.min(interval + 1000, 5000);
    attempt++;
  }

  throw new Error("Analysis timed out. Please try again.");
}

export async function generateDocuments(
  analysisId: string,
  docTypes: string[],
): Promise<{ documents: DocumentItem[] }> {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      analysis_id: analysisId,
      document_types: docTypes,
    }),
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Document generation failed: ${res.status}`);
  }

  return res.json();
}

export function getDownloadUrl(downloadPath: string): string {
  if (downloadPath.startsWith("http")) return downloadPath;
  return `${API_BASE}${downloadPath}`;
}

export async function loadDemo(
  scenario: "ecommerce" | "edtech" | "healthtech",
): Promise<StatusResponse> {
  const res = await fetch(`${API_BASE}/api/demo/${scenario}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Demo not available");
  return res.json();
}

export async function getHistory(): Promise<{ analyses: HistoryItem[] }> {
  try {
    const res = await fetch(`${API_BASE}/api/history`, {
      credentials: "include",
    });
    if (!res.ok) return { analyses: [] };
    return res.json();
  } catch {
    return { analyses: [] };
  }
}

export async function checkHealth(): Promise<{
  status: string;
  chroma: Record<string, unknown>;
  version: string;
}> {
  const res = await fetch(`${API_BASE}/api/health`);
  return res.json();
}
