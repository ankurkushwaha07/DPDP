"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import StepUpload from "@/components/wizard/StepUpload";
import StepAnalysis from "@/components/wizard/StepAnalysis";
import StepDocuments from "@/components/wizard/StepDocuments";
import HistorySidebar from "@/components/HistorySidebar";
import { startAnalysis, pollAnalysis, generateDocuments, loadDemo } from "@/lib/api";
import type {
  AnalyzeRequestBody,
  AnalysisResult,
  DocumentItem,
  StatusResponse,
} from "@/lib/api";

type Step = "upload" | "analyzing" | "results" | "documents";

function AnalyzePageContent() {
  const searchParams = useSearchParams();
  const demoScenario = searchParams.get("demo");

  const [step, setStep] = useState<Step>("upload");
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("Starting analysis...");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (
      demoScenario &&
      ["ecommerce", "edtech", "healthtech"].includes(demoScenario)
    ) {
      void handleLoadDemo(demoScenario as "ecommerce" | "edtech" | "healthtech");
    }
  }, [demoScenario]);

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
        setStep("results");
      } else {
        throw new Error("Demo data unavailable");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load demo");
      setStep("upload");
    }
  };

  const handleSubmit = async (data: AnalyzeRequestBody) => {
    setIsLoading(true);
    setError(null);
    setStep("analyzing");
    setProgress("Submitting for analysis...");

    try {
      const { analysis_id } = await startAnalysis(data);
      setAnalysisId(analysis_id);

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
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setStep("upload");
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

      const { documents: docs } = await generateDocuments(analysisId, allDocTypes);
      setDocuments(docs);
      setStep("documents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Document generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRestart = () => {
    setStep("upload");
    setAnalysisId(null);
    setResult(null);
    setDocuments([]);
    setError(null);
    setProgress("Starting analysis...");
    window.history.replaceState({}, "", "/analyze");
  };

  const steps = [
    { key: "upload", label: "Upload" },
    { key: "results", label: "Analysis" },
    { key: "documents", label: "Documents" },
  ];
  const activeStepIndex =
    step === "upload" || step === "analyzing" ? 0 : step === "results" ? 1 : 2;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 flex gap-6">
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-24 bg-white rounded-xl border border-gray-200">
          <HistorySidebar
            onSelectAnalysis={(id) => {
              window.location.href = `/analyze?history=${id}`;
            }}
            currentAnalysisId={analysisId}
          />
        </div>
      </aside>

      <div className="flex-1 max-w-4xl">
        <div className="flex items-center justify-center gap-2 mb-10">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i <= activeStepIndex
                    ? "bg-teal-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`ml-2 text-sm ${
                  i <= activeStepIndex
                    ? "text-teal-700 font-medium"
                    : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={`w-12 h-0.5 mx-3 ${
                    i < activeStepIndex ? "bg-teal-400" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <span className="text-red-500">!</span>
            <div>
              <p className="text-red-800 text-sm font-medium">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              x
            </button>
          </div>
        )}

        {step === "upload" && (
          <StepUpload onSubmit={handleSubmit} isLoading={isLoading} />
        )}

        {step === "analyzing" && (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-4" />
            <p className="text-lg font-medium text-gray-700">{progress}</p>
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
          />
        )}

        {step === "documents" && (
          <StepDocuments documents={documents} onRestart={handleRestart} />
        )}
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
