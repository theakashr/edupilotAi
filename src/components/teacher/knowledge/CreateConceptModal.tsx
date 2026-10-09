"use client";

import { useState } from "react";
import { X, Lightbulb, Loader2 } from "lucide-react";
import type { Concept, Material } from "@/types";
import { conceptService } from "@/services/knowledge/conceptService";

interface CreateConceptModalProps {
  courseId: string;
  existingConcepts: Concept[];
  materials: Material[];
  onClose: () => void;
  onSuccess: (newConcept: Concept) => void;
}

export function CreateConceptModal({
  courseId,
  existingConcepts,
  materials,
  onClose,
  onSuccess,
}: CreateConceptModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<number>(5);
  const [selectedPrereqIds, setSelectedPrereqIds] = useState<string[]>([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
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

      // Check duplicate
      const dupRes = await conceptService.findDuplicateConcept(courseId, name.trim());
      if (dupRes.success && dupRes.data) {
        setError(`A concept with a similar name already exists: "${dupRes.data.name}"`);
        setSubmitting(false);
        return;
      }

      const res = await conceptService.createConcept({
        courseId,
        name: name.trim(),
        description: description.trim() || undefined,
        difficulty,
        prerequisiteConceptIds: selectedPrereqIds,
        materialIds: selectedMaterialIds,
      });

      if (!res.success) {
        setError(res.error);
      } else if (!res.data) {
        setError("Failed to create concept");
      } else {
        onSuccess(res.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating concept");
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-concept-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h2 id="create-concept-modal-title" className="text-lg font-bold text-gray-900">
                New Knowledge Concept
              </h2>
              <p className="text-xs text-gray-500">Create an authoritative educational concept</p>
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
            <label htmlFor="concept-name" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Concept Name <span className="text-red-500">*</span>
            </label>
            <input
              id="concept-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dynamic Memory Allocation"
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          <div>
            <label htmlFor="concept-desc" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Description / Learning Definition
            </label>
            <textarea
              id="concept-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the concept scope and key principles..."
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="concept-diff" className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Relative Difficulty (1–10)
              </label>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                Level {difficulty}
              </span>
            </div>
            <input
              id="concept-diff"
              type="range"
              min={1}
              max={10}
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-gray-400 mt-1">
              <span>Introductory (1)</span>
              <span>Intermediate (5)</span>
              <span>Advanced (10)</span>
            </div>
          </div>

          {/* Prerequisite selection */}
          {existingConcepts.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Prerequisites (Concepts needed beforehand)
              </label>
              <div className="max-h-32 overflow-y-auto rounded-xl border border-gray-200 p-2 space-y-1 divide-y divide-gray-100">
                {existingConcepts.map((c) => (
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
                    <span className="text-[10px] text-gray-400 ml-auto">Lvl {c.difficulty ?? 5}</span>
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
                  Creating…
                </>
              ) : (
                "Create Concept"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
