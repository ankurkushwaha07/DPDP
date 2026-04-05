"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useUser, SignInButton } from "@clerk/nextjs";
import StepUpload from "@/components/wizard/StepUpload";
import StepAnalysis from "@/components/wizard/StepAnalysis";
import StepDocuments from "@/components/wizard/StepDocuments";
import HistorySidebar from "@/components/HistorySidebar";
import { startAnalysis, pollAnalysis, generateDocuments, loadDemo, getAnalysisDetails } from "@/lib/api";
import type {
  AnalyzeRequestBody,
  AnalysisResult,
  DocumentItem,
  StatusResponse,
} from "@/lib/api";

type Step = "upload" | "analyzing" | "results" | "documents";

const DEMO_INPUTS: Record<string, { product_description: string; schema_text: string; privacy_policy_text: string; company_details: { name: string; contact_email: string; dpo_name: string; grievance_email: string } }> = {
  ecommerce: {
    product_description: "ShopEasy is an Indian e-commerce platform that enables customers to browse, purchase, and track products. It collects personal, financial, and behavioral data to process orders, enable payments, and personalise the shopping experience.",
    schema_text: JSON.stringify({
      users: ["name", "email", "phone", "address", "date_of_birth"],
      payments: ["credit_card_number", "upi_id", "bank_account", "transaction_history"],
      behaviour: ["browsing_history", "search_queries", "wishlist", "purchase_history"],
      marketing: ["device_id", "ip_address", "location"]
    }, null, 2),
    privacy_policy_text: "ShopEasy collects personal information including name, email, phone and address for order fulfillment. Payment data is collected for transaction processing. We may share data with delivery partners. Users can contact support@shopeasy.in for queries.",
    company_details: { name: "ShopEasy Pvt Ltd", contact_email: "privacy@shopeasy.in", dpo_name: "Rahul Sharma", grievance_email: "grievance@shopeasy.in" }
  },
  edtech: {
    product_description: "LearnBharat is a K-12 online learning platform serving students aged 6-18 across India. It collects student profiles, academic performance, and learning behaviour data to personalise education and report progress to parents.",
    schema_text: JSON.stringify({
      students: ["name", "age", "grade", "school_name", "parent_name", "parent_email", "parent_phone"],
      academic: ["test_scores", "assignment_grades", "attendance", "learning_pace", "subject_performance"],
      behaviour: ["video_watch_time", "quiz_attempts", "login_frequency", "device_used"],
      content: ["preferred_subjects", "difficulty_level", "completed_courses"]
    }, null, 2),
    privacy_policy_text: "LearnBharat collects student information to provide personalised learning. We collect name, age, grade and academic performance data. Parent contact details are collected for progress reports. Data is stored securely and not shared with third parties.",
    company_details: { name: "LearnBharat EdTech Pvt Ltd", contact_email: "privacy@learnbharat.in", dpo_name: "Priya Menon", grievance_email: "grievance@learnbharat.in" }
  },
  healthtech: {
    product_description: "MedConnect is a telemedicine platform connecting patients with doctors across India. It handles medical records, prescriptions, health vitals, Aadhaar-based identity verification, and biometric data for authentication.",
    schema_text: JSON.stringify({
      patients: ["name", "aadhaar_number", "date_of_birth", "gender", "blood_group", "emergency_contact"],
      medical: ["medical_history", "current_medications", "allergies", "diagnoses", "lab_reports", "prescriptions"],
      biometric: ["fingerprint_hash", "face_id", "voice_signature"],
      vitals: ["blood_pressure", "blood_sugar", "heart_rate", "weight", "bmi"],
      telemedicine: ["consultation_recordings", "chat_transcripts", "doctor_notes"]
    }, null, 2),
    privacy_policy_text: "MedConnect collects personal and health information to facilitate telemedicine consultations. We collect Aadhaar for identity verification, medical history for treatment, and biometric data for authentication. Health data is encrypted and accessible only to treating physicians.",
    company_details: { name: "MedConnect Health Pvt Ltd", contact_email: "privacy@medconnect.in", dpo_name: "Dr. Anita Rao", grievance_email: "grievance@medconnect.in" }
  }
};

function AnalyzePageContent() {
  const searchParams = useSearchParams();
  const demoScenario = searchParams.get("demo");
  const historyId = searchParams.get("history");
  const { isSignedIn } = useUser();
  const isGuest = !isSignedIn;

  const [step, setStep] = useState<Step>("upload");
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [initialInputs, setInitialInputs] = useState<AnalyzeRequestBody | null>(null);
  const [isHistoryView, setIsHistoryView] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("Starting analysis...");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const changeStep = (s: Step) => {
    setStep(s);
    if (s !== "analyzing" && typeof window !== "undefined") {
      window.location.hash = s;
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const h = window.location.hash.replace("#", "");
      if (h === "upload" || h === "results" || h === "documents") {
        setStep(h as Step);
      } else if (h === "") {
        setStep("upload");
      }
    };
    
    window.addEventListener("hashchange", handleHashChange);
    // initial check
    if (window.location.hash) handleHashChange();
    
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (historyId && !isGuest) {
      void handleLoadHistory(historyId);
    } else if (
      demoScenario &&
      ["ecommerce", "edtech", "healthtech"].includes(demoScenario)
    ) {
      // Pre-fill the form with demo inputs instead of auto-running analysis
      const inputs = DEMO_INPUTS[demoScenario];
      if (inputs) setInitialInputs(inputs);
    }
  }, [demoScenario, historyId]);

  const handleLoadHistory = async (id: string) => {
    try {
      setStep("analyzing");
      setProgress("Loading history data...");
      setError(null);
      setIsHistoryView(true);

      const status = await getAnalysisDetails(id);

      if (status.status === "completed" && status.result) {
        setAnalysisId(status.analysis_id);
        setResult(status.result);
        
        if (status.inputs) setInitialInputs(status.inputs);
        if (status.documents && status.documents.length > 0) setDocuments(status.documents);
        
        changeStep("results");
      } else {
        throw new Error("History data is not fully completed or unavailable");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
      changeStep("upload");
    }
  };

  const handleLoadDemo = async (
    scenario: "ecommerce" | "edtech" | "healthtech",
  ) => {
    try {
      setStep("analyzing");
      setProgress("Loading demo scenario...");
      setError(null);

      const demoResult = await loadDemo(scenario);

      if (demoResult.status === "completed" && demoResult.result) {
        setAnalysisId(demoResult.analysis_id);
        setResult(demoResult.result);
        changeStep("results");
      } else {
        throw new Error("Demo data unavailable");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load demo");
      changeStep("upload");
    }
  };

  const handleSubmit = async (data: AnalyzeRequestBody) => {
    setIsLoading(true);
    setInitialInputs(data);
    setError(null);
    setStep("analyzing");
    setProgress("Submitting for analysis...");

    try {
      // If this is a demo scenario, use pre-computed results instantly
      if (demoScenario && ["ecommerce", "edtech", "healthtech"].includes(demoScenario)) {
        setProgress("Loading demo results...");
        const demoResult = await loadDemo(demoScenario as "ecommerce" | "edtech" | "healthtech");
        if (demoResult.status === "completed" && demoResult.result) {
          setAnalysisId(demoResult.analysis_id);
          setResult(demoResult.result);
          changeStep("results");
          return;
        }
        throw new Error("Demo data unavailable");
      }

      if (isHistoryView && analysisId) {
        data.parent_analysis_id = analysisId;
      }

      const { analysis_id } = await startAnalysis(data);
      setAnalysisId(analysis_id);
      setIsHistoryView(false);

      setProgress("Classifying data fields...");
      const analysisResult = await pollAnalysis(analysis_id, (status: StatusResponse) => {
        if (status.step) {
          const stepLabels: Record<string, string> = {
            classifying_data: "Classifying data fields...",
            mapping_obligations: "Mapping DPDP obligations...",
            analyzing: "Running gap analysis...",
            generating: "Preparing results...",
          };
          setProgress(stepLabels[status.step] || "Processing...");
        }
        if (status.progress_percent) {
          setProgress(
            (prev) => `${prev.replace(/\(\d+%\)/, "").trim()} (${status.progress_percent}%)`,
          );
        }
      });

      setResult(analysisResult);
      setIsHistoryView(true);
      setHistoryRefreshKey((k) => k + 1);
      changeStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      changeStep("upload");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateDocs = async () => {
    if (!analysisId) return;

    setIsGenerating(true);
    setError(null);

    try {
      const allDocTypes = [
        "privacy_notice",
        "consent_text",
        "retention_matrix",
        "breach_sop",
        "gap_report",
      ];

      // Demo analysis IDs are not saved in the DB — run a real analysis first
      let targetId = analysisId;
      if (analysisId.startsWith("demo-") && initialInputs) {
        changeStep("analyzing");
        setProgress("Running analysis to generate your documents...");
        const { analysis_id } = await startAnalysis(initialInputs);
        await pollAnalysis(analysis_id, (status: StatusResponse) => {
          if (status.step) {
            const stepLabels: Record<string, string> = {
              classifying_data: "Classifying data fields...",
              mapping_obligations: "Mapping DPDP obligations...",
              analyzing: "Running gap analysis...",
              generating: "Preparing results...",
            };
            setProgress(stepLabels[status.step] || "Processing...");
          }
        });
        targetId = analysis_id;
        setAnalysisId(analysis_id);
        changeStep("results");
      }

      const { documents: docs } = await generateDocuments(targetId, allDocTypes);
      setDocuments(docs);
      changeStep("documents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Document generation failed");
      changeStep("results");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRestart = () => {
    setStep("upload");
    setAnalysisId(null);
    setResult(null);
    setDocuments([]);
    setInitialInputs(null);
    setIsHistoryView(false);
    setError(null);
    setProgress("Starting analysis...");
    window.location.href = "/analyze";
  };

  const steps = [
    { key: "upload", label: "Upload" },
    { key: "results", label: "Analysis" },
    { key: "documents", label: "Documents" },
  ];
  const activeStepIndex =
    step === "upload" || step === "analyzing" ? 0 : step === "results" ? 1 : 2;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 pb-6 sm:pb-10">
      {isGuest && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠</span>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <span className="font-semibold">Guest mode</span> — you can run a full analysis and download your documents, but this session won&apos;t be saved. You won&apos;t be able to access it later.
            </p>
          </div>
          <SignInButton mode="modal">
            <button className="flex-shrink-0 text-sm bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap">
              Sign in to save
            </button>
          </SignInButton>
        </div>
      )}

    <div className="flex gap-4 sm:gap-6 pt-6 sm:pt-10">
      {!isGuest && (
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-24 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 transition-colors">
          <HistorySidebar
            onSelectAnalysis={(id) => {
              window.location.href = `/analyze?history=${id}`;
            }}
            currentAnalysisId={analysisId}
            refreshKey={historyRefreshKey}
          />
        </div>
      </aside>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6 sm:mb-10">
          {steps.map((s, i) => {
            const isClickable = isHistoryView && result != null;
            return (
              <div key={s.key} className="flex items-center">
                <button
                  onClick={() => {
                    if (isClickable || i <= activeStepIndex) {
                      changeStep(s.key as Step);
                    }
                  }}
                  disabled={!isClickable && i > activeStepIndex}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors ${
                    i <= activeStepIndex
                      ? "bg-teal-600 text-white hover:bg-teal-700"
                      : isClickable ? "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700" : "bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-600 cursor-not-allowed"
                  }`}
                >
                  {i + 1}
                </button>
                <span
                  className={`ml-1 sm:ml-2 text-xs sm:text-sm ${
                    i <= activeStepIndex
                      ? "text-teal-700 dark:text-teal-400 font-medium"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <div
                    className={`w-6 sm:w-12 h-0.5 mx-1 sm:mx-3 ${
                      i < activeStepIndex ? "bg-teal-400" : "bg-gray-200 dark:bg-gray-800"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900/50 rounded-lg p-4 mb-6 flex items-start gap-3">
            <span className="text-red-500">!</span>
            <div>
              <p className="text-red-800 dark:text-red-400 text-sm font-medium">Error</p>
              <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600 dark:hover:text-red-300"
            >
              x
            </button>
          </div>
        )}

        {step === "upload" && (
          <StepUpload
            onSubmit={handleSubmit}
            isLoading={isLoading}
            initialInputs={initialInputs}
            isHistoryView={isHistoryView}
            isDemoMode={!!(demoScenario && ["ecommerce", "edtech", "healthtech"].includes(demoScenario))}
          />
        )}

        {step === "analyzing" && (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-4" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">{progress}</p>
            <p className="text-sm text-gray-400 mt-2">
              This typically takes 15-30 seconds
            </p>
          </div>
        )}

        {step === "results" && result && (
          <StepAnalysis
            result={result}
            onGenerateDocs={handleGenerateDocs}
            isGenerating={isGenerating}
            hasExistingDocuments={!isGuest && documents.length > 0}
            onViewExistingDocs={() => changeStep("documents")}
            onGoToStep1={() => changeStep("upload")}
          />
        )}

        {step === "documents" && (
          <StepDocuments
            documents={documents}
            onRestart={handleRestart}
            isHistoryView={!isGuest && isHistoryView}
            onBackToResults={() => changeStep("results")}
          />
        )}
      </div>
    </div>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
        </div>
      }
    >
      <AnalyzePageContent />
    </Suspense>
  );
}
