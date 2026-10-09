"use client";

import { useState } from "react";
import { X, Edit3, Loader2 } from "lucide-react";
import type { Concept, Material } from "@/types";
import { conceptService } from "@/services/knowledge/conceptService";

interface EditConceptModalProps {
  concept: Concept;
  existingConcepts: Concept[];
  materials: Material[];
  onClose: () => void;
  onSuccess: (updatedConcept: Concept) => void;
}

export function EditConceptModal({
  concept,
  existingConcepts,
  materials,
  onClose,
  onSuccess,
}: EditConceptModalProps) {
  const [name, setName] = useState(concept.name);
  const [description, setDescription] = useState(concept.description || "");
  const [difficulty, setDifficulty] = useState<number>(concept.difficulty ?? 5);
  const [selectedPrereqIds, setSelectedPrereqIds] = useState<string[]>(
    concept.prerequisiteConceptIds || []
  );
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>(
    concept.materialIds || []
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Concept name is required");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const updates = {
        name: name.trim(),
        description: description.trim() || undefined,
        difficulty,
        prerequisiteConceptIds: selectedPrereqIds,
        materialIds: selectedMaterialIds,
      };

      const res = await conceptService.updateConcept(concept.id, updates);
      if (!res.success) {
        setError(res.error || "Failed to update concept");
      } else {
        onSuccess({
          ...concept,
          ...updates,
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error updating concept");
    } finally {
      setSubmitting(false);
    }
  };

  const togglePrereq = (conceptId: string) => {
    setSelectedPrereqIds((prev) =>
      prev.includes(conceptId) ? prev.filter((id) => id !== conceptId) : [...prev, conceptId]
    );
  };

  const toggleMaterial = (matId: string) => {
    setSelectedMaterialIds((prev) =>
      prev.includes(matId) ? prev.filter((id) => id !== matId) : [...prev, matId]
    );
  };

  const candidatePrereqs = existingConcepts.filter((c) => c.id !== concept.id);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-concept-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="edit-concept-modal-title" className="text-lg font-bold text-gray-900">
                Edit Concept
              </h2>
              <p className="text-xs text-gray-500">Update authoritative concept details</p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="edit-concept-name" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Concept Name <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-concept-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          <div>
            <label htmlFor="edit-concept-desc" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Description / Learning Definition
            </label>
            <textarea
              id="edit-concept-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="edit-concept-diff" className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Relative Difficulty (1–10)
              </label>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                Level {difficulty}
              </span>
            </div>
            <input
              id="edit-concept-diff"
              type="range"
              min={1}
              max={10}
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Prerequisite selection */}
          {candidatePrereqs.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Prerequisites (Concepts needed beforehand)
              </label>
              <div className="max-h-32 overflow-y-auto rounded-xl border border-gray-200 p-2 space-y-1 divide-y divide-gray-100">
                {candidatePrereqs.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-gray-50 cursor-pointer text-xs text-gray-800"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPrereqIds.includes(c.id)}
                      onChange={() => togglePrereq(c.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium truncate">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Associated Materials */}
          {materials.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Associated Course Materials
              </label>
              <div className="max-h-28 overflow-y-auto rounded-xl border border-gray-200 p-2 space-y-1">
                {materials.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-gray-50 cursor-pointer text-xs text-gray-800"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMaterialIds.includes(m.id)}
                      onChange={() => toggleMaterial(m.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium truncate">{m.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

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
              disabled={submitting || !name.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
