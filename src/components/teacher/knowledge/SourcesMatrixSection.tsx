"use client";

import { useEffect, useState } from "react";
import { FileText, BookOpen, Layers, Hash, Loader2 } from "lucide-react";
import type { Concept, ConceptSourceReference, Material } from "@/types";
import { conceptSourceService } from "@/services/knowledge/conceptSourceService";

interface SourcesMatrixSectionProps {
  courseId: string;
  concepts: Concept[];
  materials: Material[];
}

export function SourcesMatrixSection({
  courseId,
  concepts,
  materials,
}: SourcesMatrixSectionProps) {
  const [sources, setSources] = useState<ConceptSourceReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const conceptMap = new Map(concepts.map((c) => [c.id, c]));
  const materialMap = new Map(materials.map((m) => [m.id, m]));

  useEffect(() => {
    let ignore = false;
    async function loadCourseSources() {
      try {
        setLoading(true);
        setError(null);
        const res = await conceptSourceService.listSourcesByCourse(courseId);
        if (ignore) return;
        if (!res.success) {
          setError(res.error || "Failed to load sources");
        } else {
          setSources(res.data || []);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Error loading course sources");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadCourseSources();
    return () => {
      ignore = true;
    };
  }, [courseId]);

  return (
    <div className="space-y-6">
      {/* Materials Ingestion Overview */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Document Chunk Ingestion Matrix</h2>
          <p className="text-xs text-gray-500">
            Source documents from which deterministic concept candidates and chunks are derived
          </p>
        </div>

        {materials.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-500 bg-gray-50 rounded-xl">
            No materials uploaded for this course yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {materials.map((mat) => (
              <div
                key={mat.id}
                className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-xs font-semibold text-gray-900 truncate">
                    {mat.title}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span>{mat.pageCount ? `${mat.pageCount} pages` : "PDF"}</span>
                  <span className="font-mono">{mat.chunkCount || 0} chunks</span>
                  <span
                    className={`font-semibold capitalize ${
                      mat.status === "ready" ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {mat.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Traceable Citations Table */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Fine-Grained Provenance Index</h3>
          <p className="text-xs text-gray-500">
            {sources.length} citations grounding authoritative concepts into document chunks and pages
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
            <p className="text-xs">Loading provenance index…</p>
          </div>
        ) : error ? (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        ) : sources.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-gray-700">No chunk citations registered yet</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Approved candidates automatically register their citations to this index.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th scope="col" className="px-4 py-3">Concept</th>
                  <th scope="col" className="px-4 py-3">Source Material</th>
                  <th scope="col" className="px-4 py-3">Page</th>
                  <th scope="col" className="px-4 py-3">Chunk ID</th>
                  <th scope="col" className="px-4 py-3">Evidence Snippet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sources.map((s) => {
                  const conc = conceptMap.get(s.conceptId);
                  const mat = materialMap.get(s.materialId);

                  return (
                    <tr key={s.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-3 font-bold text-gray-900">
                        {conc?.name || "Concept"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {mat?.title || "Document"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[11px] font-medium">
                          <Layers className="w-3 h-3" />
                          Page {s.pageNumber ?? 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <Hash className="w-3 h-3 text-gray-400" />
                          {s.materialChunkId}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate italic font-serif">
                        {s.evidenceText ? `“${s.evidenceText}”` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
