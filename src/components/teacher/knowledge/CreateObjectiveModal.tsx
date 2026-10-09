"use client";

import { useState } from "react";
import { X, Target, Loader2 } from "lucide-react";
import type { Concept, LearningObjective, Material } from "@/types";

interface CreateObjectiveModalProps {
  courseId: string;
  concepts: Concept[];
  materials: Material[];
  onClose: () => void;
  onSuccess: (newObjective: LearningObjective) => void;
}

export function CreateObjectiveModal({
  courseId,
  concepts,
  materials,
  onClose,
  onSuccess,
}: CreateObjectiveModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedConceptIds, setSelectedConceptIds] = useState<string[]>([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Objective title is required");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch("/api/knowledge/objectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          title: title.trim(),
          description: description.trim() || undefined,
          conceptIds: selectedConceptIds,
          materialIds: selectedMaterialIds,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to create learning objective");
      } else {
        onSuccess(data.objective);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating objective");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleConcept = (conceptId: string) => {
    setSelectedConceptIds((prev) =>
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
      aria-labelledby="create-obj-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 id="create-obj-modal-title" className="text-lg font-bold text-gray-900">
                New Learning Objective
              </h2>
              <p className="text-xs text-gray-500">Define course-level competencies</p>
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

          <div>
            <label htmlFor="objective-title" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Objective Title <span className="text-red-500">*</span>
            </label>
            <input
              id="objective-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master memory allocation and avoid pointer leaks"
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label htmlFor="objective-desc" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Description & Success Criteria
            </label>
            <textarea
              id="objective-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail what students should understand and demonstrate..."
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Associated Concepts */}
          {concepts.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Target Concepts
              </label>
              <div className="max-h-32 overflow-y-auto rounded-xl border border-gray-200 p-2 space-y-1 divide-y divide-gray-100">
                {concepts.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-gray-50 cursor-pointer text-xs text-gray-800"
                  >
                    <input
                      type="checkbox"
                      checked={selectedConceptIds.includes(c.id)}
                      onChange={() => toggleConcept(c.id)}
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
                Supporting Materials
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
              disabled={submitting || !title.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Save Objective"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
