"use client";

import { useState } from "react";
import { X, CheckCircle2, XCircle, ShieldAlert, Layers, Hash, Sparkles, Loader2 } from "lucide-react";
import type { Concept, ConceptCandidate, Material } from "@/types";

interface ReviewCandidateModalProps {
  candidate: ConceptCandidate;
  materials: Material[];
  existingConceptMatch?: Concept;
  onClose: () => void;
  onReviewSubmit: (
    candidateId: string,
    status: "approved" | "rejected",
    customData?: { name?: string; description?: string; difficulty?: number }
  ) => Promise<void>;
}

export function ReviewCandidateModal({
  candidate,
  materials,
  existingConceptMatch,
  onClose,
  onReviewSubmit,
}: ReviewCandidateModalProps) {
  const [name, setName] = useState(candidate.name);
  const [description, setDescription] = useState(candidate.description || "");
  const [difficulty, setDifficulty] = useState<number>(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mat = materials.find((m) => m.id === candidate.materialId);

  const handleApprove = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await onReviewSubmit(candidate.id, "approved", {
        name: name.trim(),
        description: description.trim() || undefined,
        difficulty,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to approve candidate");
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await onReviewSubmit(candidate.id, "rejected");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reject candidate");
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-candidate-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="review-candidate-modal-title" className="text-lg font-bold text-gray-900">
                Review Concept Candidate
              </h2>
              <p className="text-xs text-gray-500">Teacher verification & approval gate</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Explainable Relevance Banner */}
          <div className="rounded-xl bg-purple-50/70 border border-purple-100 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-900">Candidate Relevance Score</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-200/80 text-purple-900 font-mono">
                {candidate.relevanceScore} / 100
              </span>
            </div>
            {candidate.scoringSignals.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {candidate.scoringSignals.map((sig, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-md bg-white text-purple-800 border border-purple-100 font-medium"
                  >
                    • {sig}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Duplicate Warning if existing concept matches */}
          {existingConceptMatch && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-2.5 text-xs text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Likely duplicate detected</p>
                <p className="mt-0.5 text-amber-700">
                  An authoritative concept named <span className="font-bold">“{existingConceptMatch.name}”</span> already exists in this course. Approving will register an additional concept or you may reject this candidate.
                </p>
              </div>
            </div>
          )}

          {/* Source Provenance Info */}
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-2 text-xs text-gray-600">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Source Document:</span>
              <span className="font-medium text-gray-800">{mat?.title || "Educational Material"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Document Pages:</span>
              <span className="font-medium text-purple-700 flex items-center gap-1">
                <Layers className="w-3 h-3" />
                {candidate.sourcePages.length > 0 ? candidate.sourcePages.join(", ") : "1"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Extracted Chunks:</span>
              <span className="font-mono text-[11px] text-gray-700 flex items-center gap-1">
                <Hash className="w-3 h-3 text-gray-400" />
                {candidate.sourceChunkIds.length} chunks
              </span>
            </div>
          </div>

          {/* Editable fields */}
          <div>
            <label htmlFor="review-name" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Candidate Concept Name <span className="text-red-500">*</span>
            </label>
            <input
              id="review-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          <div>
            <label htmlFor="review-desc" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Description / Summary
            </label>
            <textarea
              id="review-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="review-diff" className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Initial Difficulty (1–10)
              </label>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                Level {difficulty}
              </span>
            </div>
            <input
              id="review-diff"
              type="range"
              min={1}
              max={10}
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 gap-2">
            <button
              type="button"
              onClick={handleReject}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <XCircle className="w-4 h-4 text-red-600" />
              Reject Candidate
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={submitting || !name.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Approve as Concept
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
