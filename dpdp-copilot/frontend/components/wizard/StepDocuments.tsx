"use client";

import type { DocumentItem } from "@/lib/api";
import { getDownloadUrl } from "@/lib/api";

interface StepDocumentsProps {
  documents: DocumentItem[];
  onRestart: () => void;
  isHistoryView?: boolean;
  onBackToResults?: () => void;
}

const DOC_INFO: Record<
  string,
  { title: string; icon: string; description: string }
> = {
  privacy_notice: {
    title: "Privacy Notice",
    icon: "PN",
    description: "DPDP-compliant privacy notice citing Sections 5 and 6",
  },
  consent_text: {
    title: "Consent Texts",
    icon: "CT",
    description: "Banner, modal, and checkbox consent texts per Section 6",
  },
  retention_matrix: {
    title: "Retention Matrix",
    icon: "RM",
    description: "Data retention periods and deletion triggers per Section 8(7)",
  },
  breach_sop: {
    title: "Breach Response SOP",
    icon: "BS",
    description: "Incident response procedure per Section 8(6) and Rule 6",
  },
  gap_report: {
    title: "Gap Analysis Report",
    icon: "GR",
    description: "Full compliance gap report with section references",
  },
};

export default function StepDocuments({ documents, onRestart, isHistoryView, onBackToResults }: StepDocumentsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold dark:text-gray-100">Step 3: Your Compliance Documents</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Download your DPDP-compliant documents. Each document cites specific Act
        sections and Rules. Review with legal counsel before publishing.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        {documents.map((doc) => {
          const info = DOC_INFO[doc.doc_type] || {
            title: doc.doc_type.replace(/_/g, " "),
            icon: "DOC",
            description: "",
          };
          const hasDownload = doc.download_url && !doc.download_url.includes("stub");

          return (
            <div
              key={doc.doc_type}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 flex flex-col transition-colors"
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="text-xs font-semibold bg-gray-100 dark:bg-gray-800 dark:text-gray-200 rounded px-2 py-1">
                  {info.icon}
                </span>
                <div>
                  <h3 className="font-semibold dark:text-gray-100">{info.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{info.description}</p>
                </div>
              </div>

              <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-4 max-h-40 overflow-y-auto">
                <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-sans">
                  {doc.markdown_preview.slice(0, 500)}
                  {doc.markdown_preview.length > 500 && "..."}
                </pre>
              </div>

              {hasDownload ? (
                <a
                  href={getDownloadUrl(doc.download_url)}
                  className="block text-center py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-lg transition-colors"
                  download
                >
                  Download DOCX
                </a>
              ) : (
                <button
                  disabled
                  className="block w-full text-center py-2 bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm rounded-lg cursor-not-allowed transition-colors"
                >
                  Preview Only
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          onClick={onBackToResults}
          className="flex-1 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium rounded-lg transition-colors"
        >
          {"<-"} Back to Analysis Results
        </button>
      </div>
    </div>
  );
}
