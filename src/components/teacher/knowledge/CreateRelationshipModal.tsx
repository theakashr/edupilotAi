"use client";

import { useState } from "react";
import { X, Network, ArrowRight, Loader2 } from "lucide-react";
import type { Concept, ConceptRelationship, ConceptRelationshipType } from "@/types";

interface CreateRelationshipModalProps {
  courseId: string;
  concepts: Concept[];
  onClose: () => void;
  onSuccess: (newRel: ConceptRelationship) => void;
}

export function CreateRelationshipModal({
  courseId,
  concepts,
  onClose,
  onSuccess,
}: CreateRelationshipModalProps) {
  const [sourceConceptId, setSourceConceptId] = useState<string>(concepts[0]?.id || "");
  const [targetConceptId, setTargetConceptId] = useState<string>(concepts[1]?.id || "");
  const [type, setType] = useState<ConceptRelationshipType>("prerequisite");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceConcept = concepts.find((c) => c.id === sourceConceptId);
  const targetConcept = concepts.find((c) => c.id === targetConceptId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceConceptId || !targetConceptId) {
      setError("Please select both source and target concepts");
      return;
    }
    if (sourceConceptId === targetConceptId) {
      setError("A concept cannot relate to itself. Please choose two distinct concepts.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch("/api/knowledge/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          sourceConceptId,
          targetConceptId,
          type,
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to create concept relationship");
      } else {
        onSuccess(data.relationship);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating relationship");
    } finally {
      setSubmitting(false);
    }
  };

  const getMeaningHelper = () => {
    if (!sourceConcept || !targetConcept) return null;
    if (type === "prerequisite") {
      return `"${sourceConcept.name}" is a prerequisite for "${targetConcept.name}". Students must master "${sourceConcept.name}" first.`;
    }
    if (type === "part_of") {
      return `"${sourceConcept.name}" is a component/part of "${targetConcept.name}".`;
    }
    return `"${sourceConcept.name}" and "${targetConcept.name}" are conceptually related.`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-rel-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h2 id="create-rel-modal-title" className="text-lg font-bold text-gray-900">
                Connect Concepts
              </h2>
              <p className="text-xs text-gray-500">Define directed pedagogical relationships</p>
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Direction indicator visualization */}
          <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-4">
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex-1 p-2.5 rounded-lg bg-white border border-blue-200 text-center font-bold text-gray-900 truncate">
                {sourceConcept?.name || "Source Concept"}
              </div>
              <div className="flex flex-col items-center shrink-0">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">
                  {type}
                </span>
                <ArrowRight className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex-1 p-2.5 rounded-lg bg-white border border-blue-200 text-center font-bold text-gray-900 truncate">
                {targetConcept?.name || "Target Concept"}
              </div>
            </div>
            <p className="text-[11px] text-blue-800 text-center mt-2 font-medium">
              {getMeaningHelper()}
            </p>
          </div>

          <div>
            <label htmlFor="source-concept-select" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Source Concept (A)
            </label>
            <select
              id="source-concept-select"
              value={sourceConceptId}
              onChange={(e) => setSourceConceptId(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {concepts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Lvl {c.difficulty ?? 5})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="relationship-type-select" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Relationship Type
            </label>
            <select
              id="relationship-type-select"
              value={type}
              onChange={(e) => setType(e.target.value as ConceptRelationshipType)}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="prerequisite">prerequisite — A must be learned before B</option>
              <option value="related">related — A and B share educational context</option>
              <option value="part_of">part_of — A is a subtopic or component of B</option>
            </select>
          </div>

          <div>
            <label htmlFor="target-concept-select" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Target Concept (B)
            </label>
            <select
              id="target-concept-select"
              value={targetConceptId}
              onChange={(e) => setTargetConceptId(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {concepts.map((c) => (
                <option key={c.id} value={c.id} disabled={c.id === sourceConceptId}>
                  {c.name} {c.id === sourceConceptId ? "(Same as Source)" : `(Lvl ${c.difficulty ?? 5})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="rel-note" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Pedagogical Note (Optional)
            </label>
            <input
              id="rel-note"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Memory addressing must precede pointer manipulation"
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || sourceConceptId === targetConceptId}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting…
                </>
              ) : (
                "Establish Relationship"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
