"use client";

import { useEffect, useState } from "react";
import { getHistory } from "@/lib/api";
import type { HistoryItem } from "@/lib/api";

interface HistorySidebarProps {
  onSelectAnalysis: (analysisId: string) => void;
  currentAnalysisId?: string | null;
}

const RISK_BADGE: Record<HistoryItem["risk_score"], string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

export default function HistorySidebar({
  onSelectAnalysis,
  currentAnalysisId,
}: HistorySidebarProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await getHistory();
      setHistory(data.analyses || []);
    } catch {
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-sm text-gray-400">Loading history...</div>;
  }

  if (history.length === 0) {
    return (
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-500 mb-2">History</h3>
        <p className="text-xs text-gray-400">No past analyses yet.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-gray-500 mb-3">Past Analyses</h3>
      <div className="space-y-2">
        {history.map((item) => (
          <button
            key={item.analysis_id}
            onClick={() => onSelectAnalysis(item.analysis_id)}
            className={`w-full text-left p-3 rounded-lg border transition-colors text-sm ${
              currentAnalysisId === item.analysis_id
                ? "border-teal-300 bg-teal-50"
                : "border-gray-200 hover:border-teal-200 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium truncate">{item.company_name || "Unnamed"}</span>
              {item.version > 1 && (
                <span className="text-xs text-gray-400 ml-1">v{item.version}</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span
                className={`px-1.5 py-0.5 rounded text-xs font-medium ${RISK_BADGE[item.risk_score]}`}
              >
                {item.compliance_percentage}%
              </span>
              <span className="text-xs text-gray-400">
                {new Date(item.created_at).toLocaleDateString()}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
