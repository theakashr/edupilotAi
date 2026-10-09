"use client";

import { useState } from "react";
import { Target, Plus, Trash2, Lightbulb, FileText } from "lucide-react";
import type { Concept, LearningObjective, Material } from "@/types";
import { CreateObjectiveModal } from "./CreateObjectiveModal";

interface LearningObjectiveSectionProps {
  courseId: string;
  objectives: LearningObjective[];
  concepts: Concept[];
  materials: Material[];
  onRefresh: () => Promise<void>;
  onObjectiveCreated: (obj: LearningObjective) => void;
  onDeleteObjective: (objId: string) => Promise<void>;
}

export function LearningObjectiveSection({
  courseId,
  objectives,
  concepts,
  materials,
  onRefresh,
  onObjectiveCreated,
  onDeleteObjective,
}: LearningObjectiveSectionProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const conceptMap = new Map(concepts.map((c) => [c.id, c]));
  const materialMap = new Map(materials.map((m) => [m.id, m]));

  const handleDelete = async (objId: string) => {
    if (!window.confirm("Remove this learning objective?")) return;
    try {
      setDeletingId(objId);
      await onDeleteObjective(objId);
      await onRefresh();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Course Learning Objectives</h2>
            <p className="text-xs text-gray-500">
              {objectives.length} teacher-defined pedagogical competencies linked to concepts
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Objective
        </button>
      </div>

      {/* Objectives Grid */}
      {objectives.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-900">No learning objectives defined</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Establish course-level competencies and link them to knowledge concepts for structured educational tracking.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {objectives.map((obj) => {
            const linkedConcepts = (obj.conceptIds || [])
              .map((id) => conceptMap.get(id))
              .filter(Boolean);
            const linkedMaterials = (obj.materialIds || [])
              .map((id) => materialMap.get(id))
              .filter(Boolean);

            return (
              <div
                key={obj.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-blue-200 hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-gray-900 text-base leading-snug">
                      {obj.title}
                    </h4>
                    <button
                      type="button"
                      disabled={deletingId === obj.id}
                      onClick={() => handleDelete(obj.id)}
                      className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors shrink-0 disabled:opacity-50"
                      title="Delete objective"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {obj.description && (
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {obj.description}
                    </p>
                  )}

                  {/* Linked Concepts */}
                  {linkedConcepts.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-gray-100">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                        Linked Concepts ({linkedConcepts.length}):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {linkedConcepts.map((c) => (
                          <span
                            key={c!.id}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 font-medium"
                          >
                            <Lightbulb className="w-2.5 h-2.5" />
                            {c!.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Linked Materials */}
                  {linkedMaterials.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                        Supporting Materials:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {linkedMaterials.map((m) => (
                          <span
                            key={m!.id}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium"
                          >
                            <FileText className="w-2.5 h-2.5 text-gray-400" />
                            {m!.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isCreateOpen && (
        <CreateObjectiveModal
          courseId={courseId}
          concepts={concepts}
          materials={materials}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={(obj) => {
            onObjectiveCreated(obj);
            setIsCreateOpen(false);
          }}
        />
      )}
    </div>
  );
}
