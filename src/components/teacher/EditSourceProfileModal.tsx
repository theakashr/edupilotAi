"use client";

import { useState } from "react";
import { X, Save, AlertCircle, Loader2 } from "lucide-react";
import type { Material, SourceProfile, TrustTier } from "@/types";
import { conflictService } from "@/services/conflict/conflictService";

interface EditSourceProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material;
  courseId: string;
  userId: string;
  currentProfile?: SourceProfile | null;
  onSuccess: () => void;
}

export function EditSourceProfileModal({
  isOpen,
  onClose,
  material,
  courseId,
  userId,
  currentProfile,
  onSuccess,
}: EditSourceProfileModalProps) {
  const [trustTier, setTrustTier] = useState<TrustTier>(currentProfile?.trustTier || "secondary");
  const [rationale, setRationale] = useState(currentProfile?.rationale || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Direct client-side mutation with authenticated Firebase session
      const directRes = await conflictService.upsertSourceProfile({
        courseId,
        materialId: material.id,
        materialTitle: material.title,
        trustTier,
        rationale: rationale.trim() || undefined,
        setBy: userId,
      });

      if (directRes.success) {
        onSuccess();
        onClose();
        return;
      }

      // 2. Fallback to API route if needed
      const res = await fetch(`/api/courses/${courseId}/source-profiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: material.id,
          materialTitle: material.title,
          trustTier,
          rationale,
          userId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || directRes.error || "Failed to save source profile");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred while saving.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-slate-800">
            Source Trust Profile
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-500 mb-1">Material</h3>
            <p className="text-slate-800 font-medium">{material.title}</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 border border-red-100">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form id="source-profile-form" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Trust Tier
              </label>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors data-[selected=true]:border-indigo-600 data-[selected=true]:bg-indigo-50" data-selected={trustTier === "primary"}>
                  <input
                    type="radio"
                    name="trustTier"
                    value="primary"
                    checked={trustTier === "primary"}
                    onChange={(e) => setTrustTier(e.target.value as TrustTier)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-slate-900">Primary</div>
                    <div className="text-sm text-slate-500">
                      Core curriculum material. High trust in factual accuracy.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors data-[selected=true]:border-indigo-600 data-[selected=true]:bg-indigo-50" data-selected={trustTier === "secondary"}>
                  <input
                    type="radio"
                    name="trustTier"
                    value="secondary"
                    checked={trustTier === "secondary"}
                    onChange={(e) => setTrustTier(e.target.value as TrustTier)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-slate-900">Secondary</div>
                    <div className="text-sm text-slate-500">
                      Supplementary material. Useful for context but defer to Primary sources on conflicts.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors data-[selected=true]:border-indigo-600 data-[selected=true]:bg-indigo-50" data-selected={trustTier === "reference"}>
                  <input
                    type="radio"
                    name="trustTier"
                    value="reference"
                    checked={trustTier === "reference"}
                    onChange={(e) => setTrustTier(e.target.value as TrustTier)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-slate-900">Reference</div>
                    <div className="text-sm text-slate-500">
                      Background information. Lowest priority in conflict resolution.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="rationale" className="block text-sm font-medium text-slate-700 mb-1">
                Rationale (Optional)
              </label>
              <textarea
                id="rationale"
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={3}
                placeholder="Why is this material assigned this trust tier?"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
              />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="source-profile-form"
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
                Save Profile
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
