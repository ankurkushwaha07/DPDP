"use client";

import { useState } from "react";
import type { AnalysisResult, GapItem, DataClassification } from "@/lib/api";

interface StepAnalysisProps {
  result: AnalysisResult;
  onGenerateDocs: () => void;
  isGenerating: boolean;
  hasExistingDocuments?: boolean;
  onViewExistingDocs?: () => void;
  onGoToStep1?: () => void;
}

const SEVERITY_COLORS: Record<GapItem["severity"], string> = {
  critical: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-900/50",
  high: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-900/50",
  medium: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900/50",
  low: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-900/50",
};

const STATUS_LABELS: Record<
  GapItem["status"],
  { label: string; icon: string; color: string }
> = {
  compliant: { label: "Compliant", icon: "OK", color: "text-green-700 dark:text-green-400" },
  partial: { label: "Partial", icon: "WARN", color: "text-yellow-700 dark:text-yellow-400" },
  missing: { label: "Missing", icon: "MISS", color: "text-red-700 dark:text-red-400" },
};

const RISK_COLORS: Record<AnalysisResult["overall_risk_score"], string> = {
  high: "text-red-600 dark:text-red-400",
  medium: "text-yellow-600 dark:text-yellow-400",
  low: "text-green-600 dark:text-green-400",
};

export default function StepAnalysis({
  result,
  onGenerateDocs,
  isGenerating,
  hasExistingDocuments = false,
  onViewExistingDocs,
  onGoToStep1,
}: StepAnalysisProps) {
  const [expandedGap, setExpandedGap] = useState<string | null>(null);

  const scoreColor =
    result.compliance_percentage < 40
      ? "text-red-500"
      : result.compliance_percentage < 70
        ? "text-yellow-500"
        : "text-green-500";

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold">Step 2: Analysis Results</h2>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 transition-colors">
        <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0">
          <svg className="w-24 h-24 sm:w-32 sm:h-32 transform -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke={
                result.compliance_percentage < 40
                  ? "#ef4444"
                  : result.compliance_percentage < 70
                    ? "#eab308"
                    : "#22c55e"
              }
              strokeWidth="10"
              strokeDasharray={`${(result.compliance_percentage / 100) * 314} 314`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl sm:text-3xl font-bold ${scoreColor}`}>
              {result.compliance_percentage}%
            </span>
            <span className="text-xs text-gray-500">Compliant</span>
          </div>
        </div>

        <div className="flex-1 w-full">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-600">Overall Risk:</span>
            <span className={`font-bold uppercase ${RISK_COLORS[result.overall_risk_score]}`}>
              {result.overall_risk_score}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 sm:p-3 transition-colors">
              <div className="text-lg sm:text-xl font-bold text-green-700 dark:text-green-400">
                {result.gap_report.filter((g) => g.status === "compliant").length}
              </div>
              <div className="text-xs text-green-600 dark:text-green-500">Compliant</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2 sm:p-3 transition-colors">
              <div className="text-lg sm:text-xl font-bold text-yellow-700 dark:text-yellow-400">
                {result.gap_report.filter((g) => g.status === "partial").length}
              </div>
              <div className="text-xs text-yellow-600 dark:text-yellow-500">Partial</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 sm:p-3 transition-colors">
              <div className="text-lg sm:text-xl font-bold text-red-700 dark:text-red-400">
                {result.gap_report.filter((g) => g.status === "missing").length}
              </div>
              <div className="text-xs text-red-600 dark:text-red-500">Missing</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 transition-colors">
        <h3 className="font-semibold text-base sm:text-lg mb-4 dark:text-gray-100">Data Classification</h3>
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
                <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Field</th>
                <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Categories</th>
                <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Risk</th>
                <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {result.data_classifications.map((dc: DataClassification) => (
                <tr key={dc.field_name} className="border-b border-gray-100 dark:border-gray-800/50">
                  <td className="py-2 font-mono text-xs dark:text-gray-300">{dc.field_name}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {dc.categories.map((cat) => (
                        <span
                          key={cat}
                          className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2">
                    <span
                      className={`font-medium uppercase text-xs ${
                        dc.risk_level === "high"
                          ? "text-red-600"
                          : dc.risk_level === "medium"
                            ? "text-yellow-600"
                            : "text-green-600"
                      }`}
                    >
                      {dc.risk_level}
                    </span>
                  </td>
                  <td className="py-2 text-xs text-gray-500">
                    {Math.round(dc.confidence * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 transition-colors">
        <h3 className="font-semibold text-base sm:text-lg mb-4 dark:text-gray-100">Gap Analysis</h3>
        <div className="space-y-3">
          {result.gap_report.map((gap: GapItem) => {
            const statusInfo = STATUS_LABELS[gap.status];
            const isExpanded = expandedGap === gap.obligation;

            return (
              <div
                key={gap.obligation}
                className={`border rounded-lg overflow-hidden ${
                  gap.status === "missing"
                    ? "border-red-200"
                    : gap.status === "partial"
                      ? "border-yellow-200"
                      : "border-green-200"
                }`}
              >
                <button
                  onClick={() => setExpandedGap(isExpanded ? null : gap.obligation)}
                  className="w-full flex items-start justify-between p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left gap-2"
                >
                  <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                    <span className="text-xs mt-0.5 flex-shrink-0">{statusInfo.icon}</span>
                    <div className="min-w-0">
                      <span className="font-medium dark:text-gray-200 text-sm break-words">
                        {gap.obligation
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                      <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{gap.section_ref}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium border ${SEVERITY_COLORS[gap.severity]}`}
                    >
                      {gap.severity.toUpperCase()}
                    </span>
                    <span className="text-gray-400">{isExpanded ? "^" : "v"}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3 space-y-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Gap: </span>
                      <span className="text-gray-600 dark:text-gray-400">{gap.gap_description}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Action: </span>
                      <span className="text-gray-600 dark:text-gray-400">{gap.recommended_action}</span>
                    </div>
                    {gap.matched_dpdp_text && (
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-3 text-xs text-gray-500 dark:text-gray-400 italic">
                        DPDP Reference: &quot;{gap.matched_dpdp_text}&quot;
                      </div>
                    )}
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      Confidence: {Math.round(gap.confidence * 100)}%
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {hasExistingDocuments && onViewExistingDocs ? (
        <button
          onClick={onViewExistingDocs}
          className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-lg transition-colors"
        >
          View Previously Generated Documents -&gt;
        </button>
      ) : (
        <button
          onClick={onGenerateDocs}
          disabled={isGenerating}
          className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
        >
          {isGenerating ? "Generating Documents..." : "Generate Compliance Documents ->"}
        </button>
      )}

      {hasExistingDocuments && onGoToStep1 ? (
        <p className="text-center text-xs text-gray-400 mt-2">
          Want to modify your inputs and regenerate this report?{" "}
          <button
            onClick={onGoToStep1}
            className="text-teal-600 hover:underline"
          >
            Go to Step 1
          </button>
        </p>
      ) : (
        <p className="text-center text-xs text-gray-400 mt-2">
          Want to update your schema and re-analyze?{" "}
          <button
            onClick={() => {
              window.location.href = "/analyze";
            }}
            className="text-teal-600 hover:underline"
          >
            Start New Analysis
          </button>
        </p>
      )}
    </div>
  );
}
