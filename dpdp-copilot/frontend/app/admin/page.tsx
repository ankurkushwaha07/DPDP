"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { ShieldCheck, Users, Activity, AlertTriangle, FileText, ChevronDown, ChevronUp } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Metrics {
  total_users: number;
  total_analyses: number;
  risk_breakdown: { high: number; medium: number; low: number };
  average_compliance: number;
}

interface GapSummary {
  compliant: number;
  partial: number;
  missing: number;
  critical: number;
}

interface AnalysisDetail {
  id: string;
  company_name: string;
  company_email: string;
  dpo_name: string;
  product_description: string;
  risk_score: "high" | "medium" | "low";
  compliance_percentage: number;
  version: number;
  total_fields: number;
  total_obligations: number;
  gap_summary: GapSummary;
  doc_count: number;
  created_at: string;
}

const RISK_COLORS: Record<string, string> = {
  high: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  medium: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  low: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
};

export default function AdminPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisDetail[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    void loadData();
  }, [isLoaded]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsRes, analysesRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/metrics`),
        fetch(`${API_BASE}/api/admin/analyses`),
      ]);
      if (!metricsRes.ok || !analysesRes.ok) throw new Error("Failed to load admin data");
      const metricsData = await metricsRes.json();
      const analysesData = await analysesRes.json();
      setMetrics(metricsData);
      setAnalyses(analysesData.analyses || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex h-[80vh] items-center justify-center p-6 text-center">
        <div>
          <ShieldCheck className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-3xl font-bold dark:text-gray-100 mb-2">Unauthorized</h1>
          <p className="text-gray-500 dark:text-gray-400">Please sign in to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Platform usage and compliance metrics at a glance.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800 mb-6">
          {error}
          <button onClick={loadData} className="ml-3 underline hover:no-underline">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ========== HIGH-LEVEL METRICS ========== */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            <MetricCard
              title="Total Users"
              value={metrics?.total_users ?? 0}
              icon={<Users className="w-5 h-5 text-blue-500" />}
              color="border-blue-500"
            />
            <MetricCard
              title="Analyses Run"
              value={metrics?.total_analyses ?? 0}
              icon={<Activity className="w-5 h-5 text-teal-500" />}
              color="border-teal-500"
            />
            <MetricCard
              title="Avg Compliance"
              value={`${metrics?.average_compliance ?? 0}%`}
              icon={<ShieldCheck className="w-5 h-5 text-green-500" />}
              color="border-green-500"
            />
            <MetricCard
              title="High Risk Assets"
              value={metrics?.risk_breakdown?.high ?? 0}
              icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
              color="border-red-500"
            />
          </div>

          {/* Risk breakdown bar */}
          {metrics && (metrics.risk_breakdown.high + metrics.risk_breakdown.medium + metrics.risk_breakdown.low) > 0 && (
            <div className="mb-10 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">Risk Distribution</h3>
              <div className="flex rounded-full overflow-hidden h-4">
                {metrics.risk_breakdown.high > 0 && (
                  <div
                    className="bg-red-500 transition-all"
                    style={{ width: `${(metrics.risk_breakdown.high / metrics.total_analyses) * 100}%` }}
                    title={`High: ${metrics.risk_breakdown.high}`}
                  />
                )}
                {metrics.risk_breakdown.medium > 0 && (
                  <div
                    className="bg-yellow-400 transition-all"
                    style={{ width: `${(metrics.risk_breakdown.medium / metrics.total_analyses) * 100}%` }}
                    title={`Medium: ${metrics.risk_breakdown.medium}`}
                  />
                )}
                {metrics.risk_breakdown.low > 0 && (
                  <div
                    className="bg-green-500 transition-all"
                    style={{ width: `${(metrics.risk_breakdown.low / metrics.total_analyses) * 100}%` }}
                    title={`Low: ${metrics.risk_breakdown.low}`}
                  />
                )}
              </div>
              <div className="flex gap-6 mt-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> High: {metrics.risk_breakdown.high}</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> Medium: {metrics.risk_breakdown.medium}</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Low: {metrics.risk_breakdown.low}</span>
              </div>
            </div>
          )}

          {/* ========== DETAILED ANALYSES TABLE ========== */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Analyses</h2>
              <span className="text-xs text-gray-400">{analyses.length} records</span>
            </div>

            {analyses.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                No completed analyses yet.
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/80 backdrop-blur z-10">
                    <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <th className="px-6 py-3">Company</th>
                      <th className="px-4 py-3">Risk</th>
                      <th className="px-4 py-3">Compliance</th>
                      <th className="px-4 py-3 hidden md:table-cell">Fields</th>
                      <th className="px-4 py-3 hidden md:table-cell">Docs</th>
                      <th className="px-4 py-3 hidden lg:table-cell">Date</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {analyses.map((a) => (
                      <AnalysisRow
                        key={a.id}
                        analysis={a}
                        isExpanded={expandedId === a.id}
                        onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ========== SUB-COMPONENTS ========== */

function MetricCard({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className={`p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border-t-4 ${color} border-x border-b border-x-gray-200 dark:border-x-gray-800 border-b-gray-200 dark:border-b-gray-800`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-600 dark:text-gray-400">{title}</h3>
        {icon}
      </div>
      <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function AnalysisRow({ analysis: a, isExpanded, onToggle }: { analysis: AnalysisDetail; isExpanded: boolean; onToggle: () => void }) {
  const dateStr = (() => {
    try { return new Date(a.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return a.created_at; }
  })();

  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <td className="px-6 py-4">
          <div className="font-medium text-gray-900 dark:text-gray-100">{a.company_name}</div>
          <div className="text-xs text-gray-400 truncate max-w-[200px]">{a.company_email}</div>
        </td>
        <td className="px-4 py-4">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${RISK_COLORS[a.risk_score]}`}>
            {a.risk_score.toUpperCase()}
          </span>
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${a.compliance_percentage >= 70 ? "bg-green-500" : a.compliance_percentage >= 40 ? "bg-yellow-400" : "bg-red-500"}`}
                style={{ width: `${a.compliance_percentage}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{a.compliance_percentage}%</span>
          </div>
        </td>
        <td className="px-4 py-4 hidden md:table-cell text-gray-500 dark:text-gray-400">{a.total_fields}</td>
        <td className="px-4 py-4 hidden md:table-cell">
          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <FileText className="w-3.5 h-3.5" /> {a.doc_count}
          </span>
        </td>
        <td className="px-4 py-4 hidden lg:table-cell text-xs text-gray-400">{dateStr}</td>
        <td className="px-4 py-4 text-gray-400">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </td>
      </tr>

      {/* Expanded detail panel */}
      {isExpanded && (
        <tr>
          <td colSpan={7} className="px-6 py-5 bg-gray-50 dark:bg-gray-800/30">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Company Info */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Company Info</h4>
                <div className="space-y-1.5 text-sm">
                  <div><span className="text-gray-400">Name:</span> <span className="text-gray-800 dark:text-gray-200">{a.company_name}</span></div>
                  <div><span className="text-gray-400">Email:</span> <span className="text-gray-800 dark:text-gray-200">{a.company_email || "—"}</span></div>
                  <div><span className="text-gray-400">DPO:</span> <span className="text-gray-800 dark:text-gray-200">{a.dpo_name || "—"}</span></div>
                  <div><span className="text-gray-400">Version:</span> <span className="text-gray-800 dark:text-gray-200">v{a.version}</span></div>
                </div>
              </div>

              {/* Product Description */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Product Description</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {a.product_description}{a.product_description.length >= 150 ? "..." : ""}
                </p>
              </div>

              {/* Gap Analysis Summary */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Gap Analysis</h4>
                <div className="grid grid-cols-2 gap-2">
                  <GapBadge label="Compliant" value={a.gap_summary.compliant} color="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" />
                  <GapBadge label="Partial" value={a.gap_summary.partial} color="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400" />
                  <GapBadge label="Missing" value={a.gap_summary.missing} color="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" />
                  <GapBadge label="Critical" value={a.gap_summary.critical} color="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" />
                </div>
                <div className="mt-3 text-xs text-gray-400">
                  {a.total_obligations} obligations · {a.total_fields} data fields · {a.doc_count} documents generated
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-xs text-gray-400 font-mono">{a.id}</span>
              <span className="text-xs text-gray-400">{dateStr}</span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function GapBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`px-3 py-2 rounded-lg text-center ${color}`}>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}
