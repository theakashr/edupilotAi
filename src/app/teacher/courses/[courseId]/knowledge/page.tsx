"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { courseService } from "@/services/courses/courseService";
import { materialService } from "@/services/materials/materialService";
import { conceptService } from "@/services/knowledge/conceptService";
import { conceptCandidateService } from "@/services/knowledge/conceptCandidateService";
import { relationshipService } from "@/services/knowledge/relationshipService";
import { learningObjectiveService } from "@/services/knowledge/learningObjectiveService";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { CourseWorkspaceNav } from "@/components/teacher/CourseWorkspaceNav";
import { ConceptListSection } from "@/components/teacher/knowledge/ConceptListSection";
import { CandidateReviewSection } from "@/components/teacher/knowledge/CandidateReviewSection";
import { RelationshipSection } from "@/components/teacher/knowledge/RelationshipSection";
import { LearningObjectiveSection } from "@/components/teacher/knowledge/LearningObjectiveSection";
import { SourcesMatrixSection } from "@/components/teacher/knowledge/SourcesMatrixSection";
import type {
  Course,
  Concept,
  ConceptCandidate,
  ConceptRelationship,
  LearningObjective,
  Material,
} from "@/types";
import {
  Lightbulb,
  Sparkles,
  Network,
  Target,
  BookOpen,
  Loader2,
  ShieldAlert,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface PageProps {
  params: Promise<{ courseId: string }>;
}

type KnowledgeTab = "concepts" | "candidates" | "relationships" | "objectives" | "sources";

export default function CourseKnowledgePage({ params }: PageProps) {
  const { courseId } = use(params);
  const { user } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [candidates, setCandidates] = useState<ConceptCandidate[]>([]);
  const [relationships, setRelationships] = useState<ConceptRelationship[]>([]);
  const [objectives, setObjectives] = useState<LearningObjective[]>([]);

  const [activeTab, setActiveTab] = useState<KnowledgeTab>("concepts");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAccessDenied, setIsAccessDenied] = useState(false);

  const handleManualRefresh = async () => {
    if (!courseId || !user?.uid) return;
    try {
      setRefreshing(true);
      const [matsRes, conceptsRes, candidatesRes, relsRes, objsRes] = await Promise.all([
        materialService.listCourseMaterials(courseId),
        conceptService.listCourseConcepts(courseId, { includeArchived: true }),
        conceptCandidateService.listCourseCandidates(courseId),
        relationshipService.listCourseRelationships(courseId),
        learningObjectiveService.listCourseObjectives(courseId),
      ]);

      if (matsRes.success) setMaterials(matsRes.data || []);
      if (conceptsRes.success) setConcepts(conceptsRes.data || []);
      if (candidatesRes.success) setCandidates(candidatesRes.data || []);
      if (relsRes.success) setRelationships(relsRes.data || []);
      if (objsRes.success) setObjectives(objsRes.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      if (!courseId || !user?.uid) return;

      try {
        setLoading(true);
        setError(null);

        // 1. Course details & teacher authorization
        const courseRes = await courseService.getCourseById(courseId);
        if (ignore) return;

        if (!courseRes.success) {
          setError(courseRes.error);
          setLoading(false);
          return;
        }
        if (!courseRes.data) {
          setError("Course not found");
          setLoading(false);
          return;
        }

        if (courseRes.data.teacherId !== user.uid) {
          setIsAccessDenied(true);
          setLoading(false);
          return;
        }

        setCourse(courseRes.data);

        // 2. Fetch knowledge artifacts concurrently
        const [matsRes, conceptsRes, candidatesRes, relsRes, objsRes] = await Promise.all([
          materialService.listCourseMaterials(courseId),
          conceptService.listCourseConcepts(courseId, { includeArchived: true }),
          conceptCandidateService.listCourseCandidates(courseId),
          relationshipService.listCourseRelationships(courseId),
          learningObjectiveService.listCourseObjectives(courseId),
        ]);

        if (ignore) return;
        if (matsRes.success) setMaterials(matsRes.data || []);
        if (conceptsRes.success) setConcepts(conceptsRes.data || []);
        if (candidatesRes.success) setCandidates(candidatesRes.data || []);
        if (relsRes.success) setRelationships(relsRes.data || []);
        if (objsRes.success) setObjectives(objsRes.data || []);
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load knowledge layer data");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, [courseId, user?.uid]);

  // Review Candidate Handler
  const handleReviewCandidate = async (
    candidateId: string,
    status: "approved" | "rejected",
    customData?: { name?: string; description?: string; difficulty?: number }
  ) => {
    if (!user?.uid) return;

    const res = await fetch("/api/knowledge/candidates/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId,
        status,
        customName: customData?.name,
        customDescription: customData?.description,
        customDifficulty: customData?.difficulty,
        userId: user.uid,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to process candidate review");
    }

    // Refresh data
    await handleManualRefresh();
  };

  // Delete Concept Handler
  const handleDeleteConcept = async (conceptId: string, force?: boolean) => {
    if (!user?.uid) return;

    const res = await fetch(
      `/api/knowledge/concepts/${conceptId}?userId=${user.uid}${force ? "&force=true" : ""}`,
      { method: "DELETE" }
    );

    const data = await res.json();
    if (!res.ok || !data.success) {
      alert(`Error deleting concept: ${data.error}`);
    }
  };

  // Delete Relationship Handler
  const handleDeleteRelationship = async (relId: string) => {
    const res = await fetch(`/api/knowledge/relationships?id=${relId}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      alert(`Error deleting relationship: ${data.error}`);
    }
  };

  // Delete Objective Handler
  const handleDeleteObjective = async (objId: string) => {
    const res = await fetch(`/api/knowledge/objectives?id=${objId}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      alert(`Error deleting objective: ${data.error}`);
    }
  };

  const pendingCandidateCount = candidates.filter((c) => c.status === "pending").length;

  // Access Denied State
  if (isAccessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <TeacherNav />
        <main className="flex-1 max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-sm text-gray-600 mt-2">
            You do not have permission to view or manage the knowledge layer for this course.
          </p>
          <div className="mt-6">
            <Link
              href="/teacher/courses"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Back to Courses
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TeacherNav />

      {course && <CourseWorkspaceNav course={course} />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
              <span>Knowledge Layer & Concept Mapping</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Phase 6 Foundation
              </span>
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Deterministic pedagogical structuring: Material Chunks → Candidates → Authoritative Concepts → Relationships & Objectives
            </p>
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Data
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Error Loading Knowledge Layer</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Section Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 mb-6 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("concepts")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors shrink-0 ${
              activeTab === "concepts"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-white"
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            Concepts ({concepts.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("candidates")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors shrink-0 ${
              activeTab === "candidates"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-white"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Candidate Review
            {pendingCandidateCount > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === "candidates"
                    ? "bg-white text-purple-700"
                    : "bg-purple-100 text-purple-800"
                }`}
              >
                {pendingCandidateCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("relationships")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors shrink-0 ${
              activeTab === "relationships"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-white"
            }`}
          >
            <Network className="w-4 h-4" />
            Relationships & Prerequisites ({relationships.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("objectives")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors shrink-0 ${
              activeTab === "objectives"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-white"
            }`}
          >
            <Target className="w-4 h-4" />
            Learning Objectives ({objectives.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sources")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors shrink-0 ${
              activeTab === "sources"
                ? "bg-gray-900 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-white"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Provenance & Chunks
          </button>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
            <p className="text-sm font-medium">Loading Course Knowledge Layer…</p>
            <p className="text-xs text-gray-400 mt-1">Retrieving concepts, candidates, and relationships</p>
          </div>
        ) : (
          <>
            {activeTab === "concepts" && (
              <ConceptListSection
                courseId={courseId}
                concepts={concepts}
                materials={materials}
                onRefresh={handleManualRefresh}
                onConceptCreated={(newC) => setConcepts((prev) => [...prev, newC])}
                onConceptUpdated={(updatedC) =>
                  setConcepts((prev) => prev.map((c) => (c.id === updatedC.id ? updatedC : c)))
                }
                onDeleteConcept={handleDeleteConcept}
              />
            )}

            {activeTab === "candidates" && (
              <CandidateReviewSection
                courseId={courseId}
                candidates={candidates}
                concepts={concepts}
                materials={materials}
                onRefresh={handleManualRefresh}
                onReviewCandidate={handleReviewCandidate}
              />
            )}

            {activeTab === "relationships" && (
              <RelationshipSection
                courseId={courseId}
                relationships={relationships}
                concepts={concepts}
                onRefresh={handleManualRefresh}
                onRelationshipCreated={(newRel) => setRelationships((prev) => [newRel, ...prev])}
                onDeleteRelationship={handleDeleteRelationship}
              />
            )}

            {activeTab === "objectives" && (
              <LearningObjectiveSection
                courseId={courseId}
                objectives={objectives}
                concepts={concepts}
                materials={materials}
                onRefresh={handleManualRefresh}
                onObjectiveCreated={(newObj) => setObjectives((prev) => [newObj, ...prev])}
                onDeleteObjective={handleDeleteObjective}
              />
            )}

            {activeTab === "sources" && (
              <SourcesMatrixSection
                courseId={courseId}
                concepts={concepts}
                materials={materials}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
