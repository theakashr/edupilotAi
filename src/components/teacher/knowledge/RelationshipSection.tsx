"use client";

import { useState } from "react";
import {
  Network,
  Plus,
  ArrowRight,
  Trash2,
  HelpCircle,
  Link as LinkIcon,
} from "lucide-react";
import type { Concept, ConceptRelationship } from "@/types";
import { CreateRelationshipModal } from "./CreateRelationshipModal";

interface RelationshipSectionProps {
  courseId: string;
  relationships: ConceptRelationship[];
  concepts: Concept[];
  onRefresh: () => Promise<void>;
  onRelationshipCreated: (r: ConceptRelationship) => void;
  onDeleteRelationship: (relationshipId: string) => Promise<void>;
}

export function RelationshipSection({
  courseId,
  relationships,
  concepts,
  onRefresh,
  onRelationshipCreated,
  onDeleteRelationship,
}: RelationshipSectionProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const conceptMap = new Map(concepts.map((c) => [c.id, c]));

  const handleDelete = async (relId: string) => {
    if (!window.confirm("Remove this concept relationship?")) return;
    try {
      setDeletingId(relId);
      await onDeleteRelationship(relId);
      await onRefresh();
    } finally {
      setDeletingId(null);
    }
  };

  const getMeaning = (rel: ConceptRelationship) => {
    const src = conceptMap.get(rel.sourceConceptId)?.name || "Concept A";
    const tgt = conceptMap.get(rel.targetConceptId)?.name || "Concept B";
    if (rel.type === "prerequisite") {
      return `${src} is a prerequisite for ${tgt} (Students must learn ${src} before ${tgt})`;
    }
    if (rel.type === "part_of") {
      return `${src} is a sub-concept or component of ${tgt}`;
    }
    return `${src} is pedagogically related to ${tgt}`;
  };

  const typeBadges = {
    prerequisite: "bg-purple-50 text-purple-700 border-purple-200",
    related: "bg-emerald-50 text-emerald-700 border-emerald-200",
    part_of: "bg-amber-50 text-amber-700 border-amber-200",
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shrink-0">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Pedagogical Concept Graph</h2>
            <p className="text-xs text-gray-500">
              {relationships.length} directed relationship(s) mapped across concepts
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={concepts.length < 2}
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 disabled:opacity-50 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Connect Concepts
        </button>
      </div>

      {concepts.length < 2 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            You need at least two approved concepts in this course before establishing relationships.
          </span>
        </div>
      )}

      {/* Visual Concept Flow Diagram (Lightweight SVG / CSS) */}
      {relationships.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-purple-600" />
              Interactive Relationship Visualizer
            </h3>
            <span className="text-[11px] text-gray-400">Lightweight high-speed graph</span>
          </div>

          <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-100 overflow-x-auto">
            <div className="flex flex-wrap gap-3 items-center min-w-[500px]">
              {relationships.map((rel) => {
                const src = conceptMap.get(rel.sourceConceptId);
                const tgt = conceptMap.get(rel.targetConceptId);
                return (
                  <div
                    key={rel.id}
                    className="inline-flex items-center gap-2 p-2.5 rounded-xl bg-white border border-gray-200 shadow-2xs hover:border-purple-300 transition-colors"
                  >
                    <span className="text-xs font-bold text-gray-800 px-2 py-1 rounded-md bg-gray-50 border border-gray-200">
                      {src?.name || "Concept A"}
                    </span>

                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                          typeBadges[rel.type]
                        }`}
                      >
                        {rel.type}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                    </div>

                    <span className="text-xs font-bold text-gray-800 px-2 py-1 rounded-md bg-gray-50 border border-gray-200">
                      {tgt?.name || "Concept B"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Relationships Table */}
      {relationships.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <Network className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-900">No relationships established yet</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Connect your concepts with prerequisites, components, or related links to construct the educational knowledge graph.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Source Concept (A)</th>
                  <th scope="col" className="px-6 py-3.5">Relationship</th>
                  <th scope="col" className="px-6 py-3.5">Target Concept (B)</th>
                  <th scope="col" className="px-6 py-3.5">Pedagogical Meaning</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {relationships.map((rel) => {
                  const src = conceptMap.get(rel.sourceConceptId);
                  const tgt = conceptMap.get(rel.targetConceptId);

                  return (
                    <tr key={rel.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900">
                        {src?.name || "Unknown"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border uppercase ${
                            typeBadges[rel.type]
                          }`}
                        >
                          {rel.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">
                        {tgt?.name || "Unknown"}
                      </td>
                      <td className="px-6 py-4 text-gray-600 max-w-sm">
                        <p>{getMeaning(rel)}</p>
                        {rel.description && (
                          <p className="text-[11px] text-gray-400 italic mt-0.5">
                            Note: {rel.description}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          disabled={deletingId === rel.id}
                          onClick={() => handleDelete(rel.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete relationship"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <CreateRelationshipModal
          courseId={courseId}
          concepts={concepts}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={(rel) => {
            onRelationshipCreated(rel);
            setIsCreateOpen(false);
          }}
        />
      )}
    </div>
  );
}
