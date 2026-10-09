"use client";

import { useState } from "react";
import {
  Lightbulb,
  Plus,
  Search,
  BookOpen,
  Edit3,
  Trash2,
  Archive,
  Layers,
  Link as LinkIcon,
  Filter,
} from "lucide-react";
import type { Concept, Material } from "@/types";
import { CreateConceptModal } from "./CreateConceptModal";
import { EditConceptModal } from "./EditConceptModal";
import { SourceTraceabilityModal } from "./SourceTraceabilityModal";

interface ConceptListSectionProps {
  courseId: string;
  concepts: Concept[];
  materials: Material[];
  onRefresh: () => Promise<void>;
  onConceptCreated: (c: Concept) => void;
  onConceptUpdated: (c: Concept) => void;
  onDeleteConcept: (conceptId: string, force?: boolean) => Promise<void>;
}

export function ConceptListSection({
  courseId,
  concepts,
  materials,
  onRefresh,
  onConceptCreated,
  onConceptUpdated,
  onDeleteConcept,
}: ConceptListSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingConcept, setEditingConcept] = useState<Concept | null>(null);
  const [inspectingConcept, setInspectingConcept] = useState<Concept | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const conceptMap = new Map(concepts.map((c) => [c.id, c]));

  // Filter concepts
  const filteredConcepts = concepts.filter((c) => {
    if (!showArchived && c.status === "archived") return false;
    if (difficultyFilter !== "all") {
      const diffNum = Number(difficultyFilter);
      if (c.difficulty !== diffNum) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = c.name.toLowerCase().includes(q);
      const matchDesc = c.description?.toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    return true;
  });

  const handleDeleteClick = async (concept: Concept) => {
    const confirmMsg =
      `Are you sure you want to remove concept "${concept.name}"?\n\nIf other concepts or objectives depend on it, it will be safely archived rather than corrupted.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setDeletingId(concept.id);
      await onDeleteConcept(concept.id, false);
      await onRefresh();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action & Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Authoritative Course Concepts</h2>
            <p className="text-xs text-gray-500">
              {concepts.length} concepts approved and managed for this course
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Concept Manually
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mr-1">
            <Filter className="w-3.5 h-3.5" /> Difficulty:
          </div>
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="rounded-lg border border-gray-200 text-xs px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Difficulties</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
              <option key={d} value={d}>
                Level {d}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-xs text-gray-600 ml-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Show archived
          </label>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search concepts…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Concepts Grid */}
      {filteredConcepts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <Lightbulb className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-900">No concepts found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {concepts.length === 0
              ? "Approve concept candidates from the Review tab or click Add Concept Manually to begin structuring the knowledge layer."
              : "Try adjusting your difficulty filter or search term."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredConcepts.map((concept) => {
            const prereqs = (concept.prerequisiteConceptIds || [])
              .map((id) => conceptMap.get(id))
              .filter(Boolean);

            return (
              <div
                key={concept.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-blue-200 hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top line: Name and Level */}
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-gray-900 text-base leading-snug">
                      {concept.name}
                    </h4>
                    <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-mono">
                      Lvl {concept.difficulty ?? 5}
                    </span>
                  </div>

                  {concept.description && (
                    <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                      {concept.description}
                    </p>
                  )}

                  {/* Prerequisites tags */}
                  {prereqs.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                        Prerequisites:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {prereqs.map((p) => (
                          <span
                            key={p!.id}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100 font-medium"
                          >
                            <LinkIcon className="w-2.5 h-2.5" />
                            {p!.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status / Materials info */}
                  <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-100">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-gray-400" />
                      {concept.materialIds?.length || 0} material(s)
                    </span>

                    {concept.status === "archived" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">
                        <Archive className="w-3 h-3" /> Archived
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom action toolbar */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 gap-2">
                  <button
                    type="button"
                    onClick={() => setInspectingConcept(concept)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Inspect Citations
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingConcept(concept)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit concept"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === concept.id}
                      onClick={() => handleDeleteClick(concept)}
                      className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete or Archive concept"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {isCreateOpen && (
        <CreateConceptModal
          courseId={courseId}
          existingConcepts={concepts}
          materials={materials}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={(c) => {
            onConceptCreated(c);
            setIsCreateOpen(false);
          }}
        />
      )}

      {editingConcept && (
        <EditConceptModal
          concept={editingConcept}
          existingConcepts={concepts}
          materials={materials}
          onClose={() => setEditingConcept(null)}
          onSuccess={(updated) => {
            onConceptUpdated(updated);
            setEditingConcept(null);
          }}
        />
      )}

      {inspectingConcept && (
        <SourceTraceabilityModal
          concept={inspectingConcept}
          materials={materials}
          onClose={() => setInspectingConcept(null)}
        />
      )}
    </div>
  );
}
