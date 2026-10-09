"use client";

import { useState } from "react";
import { X, Save, AlertCircle, Loader2, CheckCircle2, FileText, ChevronRight } from "lucide-react";
import type { SourceConflict, ConflictStatus } from "@/types";
import { conflictService } from "@/services/conflict/conflictService";

interface ConflictReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflict: SourceConflict;
  courseId: string;
  userId: string;
  onSuccess: () => void;
}

export function ConflictReviewModal({
  isOpen,
  onClose,
  conflict,
  courseId,
  userId,
  onSuccess,
}: ConflictReviewModalProps) {
  const [status, setStatus] = useState<Exclude<ConflictStatus, "pending">>(
    conflict.status !== "pending" ? conflict.status as Exclude<ConflictStatus, "pending"> : "accepted"
  );
  const [trustedMaterialId, setTrustedMaterialId] = useState<string | null>(
    conflict.trustedMaterialId || null
  );
  const [resolution, setResolution] = useState(conflict.resolution || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Direct client-side mutation with authenticated Firebase session
      const directRes = await conflictService.resolveConflict(conflict.id, {
        teacherId: userId,
        status,
        resolution: resolution.trim(),
        trustedMaterialId: trustedMaterialId || null,
      });

      if (directRes.success) {
        onSuccess();
        onClose();
        return;
      }

      // 2. Fallback to API endpoint
      const res = await fetch(`/api/courses/${courseId}/conflicts/${conflict.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          resolution,
          trustedMaterialId,
          userId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || directRes.error || "Failed to resolve conflict");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred while resolving.");
    } finally {
      setLoading(false);
    }
  };

  const isResolved = conflict.status !== "pending";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-800">
              Review Source Conflict
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                conflict.severity === "high"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : conflict.severity === "medium"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }`}
            >
              {conflict.severity.toUpperCase()}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto bg-slate-50/50">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 border border-red-100">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* AI Detection Summary */}
          <div className="mb-6 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 text-indigo-600 font-medium mb-2 text-sm">
              <SparklesIcon className="w-4 h-4" />
              Agnes AI Detection
            </div>
            <p className="text-slate-800 font-medium mb-3">{conflict.conflictSummary}</p>
            {conflict.pedagogicalNote && (
              <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-700">Pedagogical Note:</span>{" "}
                {conflict.pedagogicalNote}
              </div>
            )}
            {conflict.conceptName && (
              <div className="mt-3 text-xs text-slate-500 flex items-center gap-1">
                <ChevronRight className="w-3 h-3" /> Concept context: {conflict.conceptName}
              </div>
            )}
          </div>

          {/* Source Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Source A */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Source A</span>
                  {conflict.trustTierA && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      {conflict.trustTierA}
                    </span>
                  )}
                </div>
                <h3 className="font-medium text-slate-800 line-clamp-1" title={conflict.materialTitleA}>
                  {conflict.materialTitleA || conflict.materialIdA}
                </h3>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <FileText className="w-3 h-3" />
                  {conflict.pageNumberA ? `Page ${conflict.pageNumberA}` : "No page context"}
                </div>
              </div>
              <div className="p-5 flex-1 text-sm text-slate-700 bg-red-50/30">
                {conflict.claimA}
              </div>
            </div>

            {/* Source B */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Source B</span>
                  {conflict.trustTierB && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      {conflict.trustTierB}
                    </span>
                  )}
                </div>
                <h3 className="font-medium text-slate-800 line-clamp-1" title={conflict.materialTitleB}>
                  {conflict.materialTitleB || conflict.materialIdB}
                </h3>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <FileText className="w-3 h-3" />
                  {conflict.pageNumberB ? `Page ${conflict.pageNumberB}` : "No page context"}
                </div>
              </div>
              <div className="p-5 flex-1 text-sm text-slate-700 bg-blue-50/30">
                {conflict.claimB}
              </div>
            </div>
          </div>

          {/* Teacher Decision Form */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
            <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
              Teacher Decision
              {isResolved && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Resolved
                </span>
              )}
            </h3>

            <form id="resolve-conflict-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Action
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Exclude<ConflictStatus, "pending">)}
                    disabled={isResolved}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="accepted">Acknowledge Conflict (Accepted)</option>
                    <option value="dismissed">Dismiss (Not a real conflict)</option>
                    <option value="needs_revision">Needs Material Revision</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Trusted Source (Override)
                  </label>
                  <select
                    value={trustedMaterialId || ""}
                    onChange={(e) => setTrustedMaterialId(e.target.value || null)}
                    disabled={isResolved || status === "dismissed"}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="">None / Both Acceptable</option>
                    <option value={conflict.materialIdA}>
                      Source A: {conflict.materialTitleA || conflict.materialIdA}
                    </option>
                    <option value={conflict.materialIdB}>
                      Source B: {conflict.materialTitleB || conflict.materialIdB}
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Resolution Note (for students & future AI)
                </label>
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  disabled={isResolved}
                  rows={3}
                  required={status === "accepted"}
                  placeholder={
                    status === "accepted"
                      ? "Explain which source is correct or how students should interpret this contradiction..."
                      : "Optional note..."
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
            </form>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {isResolved ? "Close" : "Cancel"}
          </button>
          {!isResolved && (
            <button
              type="submit"
              form="resolve-conflict-form"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Decision
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}
