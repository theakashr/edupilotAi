"use client";

import { useState } from "react";
import { materialService } from "@/services/materials/materialService";
import type { Material } from "@/types";
import { X, Loader2, AlertCircle } from "lucide-react";

interface EditMaterialModalProps {
  material: Material;
  isOpen: boolean;
  onClose: () => void;
  onMaterialUpdated: (updated: Material) => void;
}

export function EditMaterialModal({
  material,
  isOpen,
  onClose,
  onMaterialUpdated,
}: EditMaterialModalProps) {
  const [title, setTitle] = useState(material.title);
  const [description, setDescription] = useState(material.description || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await materialService.updateMaterial(material.id, {
        title: title.trim(),
        description: description.trim() || undefined,
      });

      if (!res.success) {
        setError(res.error);
        setLoading(false);
        return;
      }

      onMaterialUpdated({
        ...material,
        title: title.trim(),
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update material metadata");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-material-modal-title"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 id="edit-material-modal-title" className="text-lg font-semibold text-gray-900">
            Edit Material Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1 transition-colors"
            aria-label="Close dialog"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-start gap-2 border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="edit-mat-title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              id="edit-mat-title"
              type="text"
              required
              minLength={2}
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="edit-mat-desc" className="block text-sm font-medium text-gray-700 mb-1">
              Description / Notes
            </label>
            <textarea
              id="edit-mat-desc"
              rows={3}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
