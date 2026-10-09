"use client";

import { useEffect, useState } from "react";
import { X, BookOpen, FileText, Layers, Hash, Loader2 } from "lucide-react";
import type { Concept, ConceptSourceReference, Material } from "@/types";
import { conceptSourceService } from "@/services/knowledge/conceptSourceService";

interface SourceTraceabilityModalProps {
  concept: Concept;
  materials: Material[];
  onClose: () => void;
}

export function SourceTraceabilityModal({
  concept,
  materials,
  onClose,
}: SourceTraceabilityModalProps) {
  const [sources, setSources] = useState<ConceptSourceReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadSources() {
      try {
        setLoading(true);
        setError(null);
        const res = await conceptSourceService.listSourcesByConcept(concept.id);
        if (ignore) return;
        if (!res.success) {
          setError(res.error || "Failed to load source references");
        } else {
          setSources(res.data || []);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load source citations");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadSources();
    return () => {
      ignore = true;
    };
  }, [concept.id]);

  const materialMap = new Map(materials.map((m) => [m.id, m]));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="traceability-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 id="traceability-modal-title" className="text-lg font-bold text-gray-900">
                Source Provenance
              </h2>
              <p className="text-xs text-gray-500">
                Verifiable citations for <span className="font-semibold text-gray-800">“{concept.name}”</span>
              </p>
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
          <div className="bg-blue-50/60 rounded-xl p-3.5 border border-blue-100 text-xs text-blue-800">
            <p className="font-medium">Deterministic Citation Traceability</p>
            <p className="mt-0.5 text-blue-700">
              Every concept maintains provenance pointing back to the exact educational material, page number, and text chunk from which it was identified.
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
              <p className="text-sm">Loading verifiable citations…</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          ) : sources.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">No chunk citations registered</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                This concept was either created manually by the teacher or references materials prior to Phase 6 provenance logging.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sources.map((src, index) => {
                const mat = materialMap.get(src.materialId);
                return (
                  <div
                    key={src.id}
                    className="p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-200 hover:shadow-xs transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-gray-400">#{index + 1}</span>
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span>{mat?.title || "Educational Document"}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        {src.pageNumber && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100 font-medium">
                            <Layers className="w-3 h-3" />
                            Page {src.pageNumber}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-mono text-[11px]">
                          <Hash className="w-3 h-3 text-gray-400" />
                          {src.materialChunkId}
                        </span>
                      </div>
                    </div>

                    {src.evidenceText && (
                      <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-700 italic font-serif">
                        “{src.evidenceText}”
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-gray-100 px-6 py-3.5 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
