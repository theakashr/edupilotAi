"use client";

import { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Edit3,
  Layers,
  Filter,
  Loader2,
  FileText,
  ShieldAlert,
  Search,
} from "lucide-react";
import type { Concept, ConceptCandidate, Material } from "@/types";
import { ReviewCandidateModal } from "./ReviewCandidateModal";

interface CandidateReviewSectionProps {
  courseId: string;
  candidates: ConceptCandidate[];
  concepts: Concept[];
  materials: Material[];
  onRefresh: () => Promise<void>;
  onReviewCandidate: (
    candidateId: string,
    status: "approved" | "rejected",
    customData?: { name?: string; description?: string; difficulty?: number }
  ) => Promise<void>;
}

export function CandidateReviewSection({
  courseId,
  candidates,
  concepts,
  materials,
  onRefresh,
  onReviewCandidate,
}: CandidateReviewSectionProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractMsg, setExtractMsg] = useState<string | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("");
  const [reviewingCandidate, setReviewingCandidate] = useState<ConceptCandidate | null>(null);

  const materialMap = new Map(materials.map((m) => [m.id, m]));
  const conceptNameMap = new Map(concepts.map((c) => [c.name.toLowerCase().trim(), c]));

  // Filter candidates
  const filteredCandidates = candidates.filter((cand) => {
    if (selectedStatus !== "all" && cand.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = cand.name.toLowerCase().includes(q);
      const matchDesc = cand.description?.toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    return true;
  });

  const handleExtract = async () => {
    try {
      setExtracting(true);
      setExtractMsg(null);

      const res = await fetch("/api/knowledge/extract-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          materialId: selectedMaterialId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setExtractMsg(data.error || "Failed to extract candidates");
      } else {
        setExtractMsg(
          `Extraction complete: ${data.totalExtracted} candidate(s) evaluated, ${data.newSaved} new queued for review.`
        );
        await onRefresh();
      }
    } catch (err: unknown) {
      setExtractMsg(err instanceof Error ? err.message : "Error extracting candidates");
    } finally {
      setExtracting(false);
    }
  };

  const pendingCount = candidates.filter((c) => c.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Banner & Trigger Bar */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-900 to-indigo-900 p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-800/80 text-purple-200 border border-purple-700">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              Human-in-the-Loop Review
            </span>
            <span className="text-xs text-purple-200">
              {pendingCount} pending teacher approval
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            Deterministic Concept Candidate Extraction
          </h2>
          <p className="text-xs text-purple-200 leading-relaxed">
            Concepts are detected directly from document headings, section numbers, and repeated terms across material chunks. Review, customize, or reject candidate terms before they become authoritative course concepts.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          {materials.length > 0 && (
            <select
              value={selectedMaterialId}
              onChange={(e) => setSelectedMaterialId(e.target.value)}
              className="rounded-xl bg-purple-950/60 border border-purple-700/60 text-xs text-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="">All Ready Materials</option>
              {materials
                .filter((m) => m.status === "ready")
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleExtract}
            disabled={extracting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-purple-950 shadow-md hover:bg-purple-50 disabled:opacity-50 transition-colors"
          >
            {extracting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-purple-700" />
                Extracting…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-purple-600" />
                Extract Candidates
              </>
            )}
          </button>
        </div>
      </div>

      {extractMsg && (
        <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-center justify-between">
          <span>{extractMsg}</span>
          <button
            type="button"
            onClick={() => setExtractMsg(null)}
            className="text-purple-600 font-semibold hover:underline ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {(["pending", "approved", "rejected", "all"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                selectedStatus === st
                  ? "bg-purple-100 text-purple-800 font-semibold"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {st} {st === "pending" && `(${pendingCount})`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search candidates…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Candidates List */}
      {filteredCandidates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-900">No candidates match this filter</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {candidates.length === 0
              ? "Run candidate extraction above to automatically identify potential concepts from uploaded document chunks."
              : "Try switching the status filter or clearing your search term."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCandidates.map((cand) => {
            const mat = materialMap.get(cand.materialId);
            const duplicateMatch =
              conceptNameMap.get(cand.normalizedName) ||
              (cand.duplicateOfConceptId ? concepts.find((c) => c.id === cand.duplicateOfConceptId) : undefined);

            return (
              <div
                key={cand.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-purple-200 hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Header & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-gray-900 text-base">{cand.name}</h4>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                        {cand.description}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                        cand.status === "approved"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : cand.status === "rejected"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-purple-50 text-purple-700 border border-purple-200"
                      }`}
                    >
                      {cand.status}
                    </span>
                  </div>

                  {/* Duplicate warning */}
                  {duplicateMatch && cand.status === "pending" && (
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-50 text-[11px] text-amber-800 border border-amber-200">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        Matches existing concept: <strong>{duplicateMatch.name}</strong>
                      </span>
                    </div>
                  )}

                  {/* Scoring signals & Source */}
                  <div className="space-y-2 pt-1 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Relevance Score:</span>
                      <span className="font-bold font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                        {cand.relevanceScore} / 100
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {cand.scoringSignals.slice(0, 2).map((sig, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600"
                        >
                          {sig}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                      <span className="flex items-center gap-1 truncate max-w-[180px]">
                        <FileText className="w-3 h-3 text-gray-400" />
                        {mat?.title || "Material"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-gray-400" />
                        Pages {cand.sourcePages.slice(0, 3).join(", ") || "1"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {cand.status === "pending" ? (
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => onReviewCandidate(cand.id, "approved")}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewingCandidate(cand)}
                      className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl border border-gray-300 bg-white text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-gray-500" />
                      Edit & Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => onReviewCandidate(cand.id, "rejected")}
                      className="p-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                      title="Reject candidate"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-gray-400 italic pt-2 border-t border-gray-100">
                    Reviewed by teacher
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review & Edit Modal */}
      {reviewingCandidate && (
        <ReviewCandidateModal
          candidate={reviewingCandidate}
          materials={materials}
          existingConceptMatch={conceptNameMap.get(reviewingCandidate.normalizedName)}
          onClose={() => setReviewingCandidate(null)}
          onReviewSubmit={onReviewCandidate}
        />
      )}
    </div>
  );
}
