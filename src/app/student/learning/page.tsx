"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { courseService } from "@/services/courses/courseService";
import { materialService } from "@/services/materials/materialService";
import { conceptService } from "@/services/knowledge/conceptService";
import { storageService } from "@/services/storage/storageService";
import type { Course, Concept, Material } from "@/types";
import {
  Sparkles,
  BookOpen,
  ArrowRight,
  Layers,
  FileText,
  ChevronRight,
  BrainCircuit,
  X,
  Info,
  Eye,
  Loader2,
} from "lucide-react";
import { DiagnosticAssessmentModal } from "@/components/student/DiagnosticAssessmentModal";
import { AdaptiveLearningPlan } from "@/components/student/AdaptiveLearningPlan";
import { NoEnrolledCourses } from "@/components/student/NoEnrolledCourses";

export default function StudentLearningPage() {
  const { user, profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Real course-scoped materials and concepts
  const [materials, setMaterials] = useState<Material[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);

  // 1. Fetch enrolled courses
  useEffect(() => {
    let ignore = false;

    async function loadCourses() {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await courseService.listStudentCourses(user.uid, profile?.studentId);
        if (ignore) return;

        if (res.success && res.data) {
          setCourses(res.data);
          if (res.data.length > 0) {
            setSelectedCourse(res.data[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load enrolled courses:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadCourses();

    return () => {
      ignore = true;
    };
  }, [user?.uid, profile?.studentId]);

  // 2. Load materials and concepts for selected course
  useEffect(() => {
    let ignore = false;

    async function loadCourseContent() {
      if (!selectedCourse?.id) return;

      try {
        setDataLoading(true);
        const [matRes, conRes] = await Promise.all([
          materialService.listCourseMaterials(selectedCourse.id),
          conceptService.listCourseConcepts(selectedCourse.id),
        ]);

        if (ignore) return;

        if (matRes.success && matRes.data) {
          setMaterials(matRes.data.filter((m) => m.status !== "archived" && m.status !== "failed"));
        } else {
          setMaterials([]);
        }

        if (conRes.success && conRes.data) {
          setConcepts(conRes.data);
        } else {
          setConcepts([]);
        }
      } catch (err) {
        console.error("Failed to load course content:", err);
      } finally {
        if (!ignore) setDataLoading(false);
      }
    }

    loadCourseContent();

    return () => {
      ignore = true;
    };
  }, [selectedCourse?.id]);

  const handleOpenMaterial = async (mat: Material) => {
    try {
      setDownloadingId(mat.id);
      const urlRes = await storageService.getSignedUrl(mat.storagePath, 120);
      if (!urlRes.success) {
        alert(`Failed to open document: ${urlRes.error}`);
        return;
      }
      window.open(urlRes.data, "_blank", "noopener,noreferrer");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to open document");
    } finally {
      setDownloadingId(null);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-48 bg-slate-200/80 rounded-2xl" />
        <div className="h-44 w-full bg-slate-200/80 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 bg-slate-200/70 rounded-2xl" />
          <div className="h-64 bg-slate-200/70 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Phase E: If no courses enrolled, render real empty state
  if (courses.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
            Curriculum &amp; Knowledge Map
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-2">
            My Learning
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Access verified course materials, conceptual graphs, and curriculum modules.
          </p>
        </div>

        <NoEnrolledCourses
          title="No Course Materials Available"
          description="You are not enrolled in any active courses yet. Share your Student ID with your teacher to be enrolled."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
            Curriculum &amp; Knowledge Map
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-2">
            My Learning
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Explore concepts, review verified learning materials, and deepen subject mastery.
          </p>
        </div>

        {/* Course Switcher */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label htmlFor="course-select" className="text-xs font-medium text-slate-400">
            Course:
          </label>
          <div className="relative">
            <select
              id="course-select"
              value={selectedCourse?.id || ""}
              onChange={(e) => {
                const found = courses.find((c) => c.id === e.target.value);
                if (found) setSelectedCourse(found);
              }}
              className="appearance-none bg-white border border-slate-200/90 text-slate-800 text-xs font-semibold py-2 pl-3 pr-8 rounded-xl shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none rotate-90" />
          </div>
        </div>
      </div>

      {/* Course Overview Banner */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-8 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Course Curriculum &bull; {selectedCourse?.subject || "General"}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              {selectedCourse?.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
              {selectedCourse?.description || "Course materials, verified concepts, and adaptive learning paths."}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>{concepts.length} Verified Concepts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>{materials.length} Course Materials</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BrainCircuit className="w-4 h-4 text-indigo-600" />
                <span>AI Tutor Grounding Enabled</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-4 bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Baseline Assessment
              </span>
              <p className="text-xs text-slate-600 mt-1">
                Calibrate your understanding of course concepts through a quick diagnostic.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsDiagnosticOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Launch Course Diagnostic</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Adaptive Learning Plan ─────────────────────────────────────── */}
      {selectedCourse && (
        <AdaptiveLearningPlan
          courseId={selectedCourse.id}
          courseTitle={selectedCourse.title}
          onLaunchAssessment={() => setIsDiagnosticOpen(true)}
        />
      )}

      {/* ─── Section 1: Verified Concepts ─────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Course Concepts &amp; Knowledge Map ({concepts.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">Click a concept to inspect details</span>
        </div>

        {dataLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
            <div className="h-40 bg-slate-100 rounded-2xl" />
            <div className="h-40 bg-slate-100 rounded-2xl" />
          </div>
        ) : concepts.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200/80 p-8 text-center shadow-xs">
            <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">No Concepts Mapped Yet</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Your instructor has not yet created or extracted concepts for this course. Concepts will appear here once published.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {concepts.map((concept) => (
              <div
                key={concept.id}
                onClick={() => setSelectedConcept(concept)}
                className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                      Difficulty: {concept.difficulty}/10
                    </span>
                    {concept.prerequisiteConceptIds && concept.prerequisiteConceptIds.length > 0 && (
                      <span className="text-[10px] text-slate-400">
                        {concept.prerequisiteConceptIds.length} prereq{concept.prerequisiteConceptIds.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>

                  <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {concept.name}
                  </h4>

                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-3 leading-relaxed">
                    {concept.description || "Core foundational concept in this course."}
                  </p>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {concept.materialIds?.length || 0} Material references
                  </span>
                  <span className="text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    <span>Details</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Section 2: Published Course Materials ────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Published Course Materials ({materials.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">Verified by course instructor</span>
        </div>

        {materials.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200/80 p-8 text-center shadow-xs">
            <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">No Learning Materials Uploaded</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Your instructor has not published any learning materials for this course yet.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="divide-y divide-slate-100">
              {materials.map((mat) => (
                <div
                  key={mat.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900">
                          {mat.title}
                        </h4>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          {mat.type}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Verified
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {mat.fileName} &bull; {formatFileSize(mat.fileSize)}
                        {mat.pageCount ? ` • ${mat.pageCount} pages` : ""}
                      </p>
                      {mat.description && (
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {mat.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenMaterial(mat)}
                      disabled={downloadingId === mat.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs hover:border-slate-300 transition-all cursor-pointer disabled:opacity-50"
                      title="Open and read document in new tab"
                    >
                      {downloadingId === mat.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                      )}
                      <span>{downloadingId === mat.id ? "Opening..." : "View / Download"}</span>
                    </button>

                    <Link
                      href={`/student/ai-tutor?courseId=${selectedCourse?.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                    >
                      <BrainCircuit className="w-3.5 h-3.5" />
                      <span>Ask AI Tutor</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Concept Details Modal ────────────────────────────────────────── */}
      {selectedConcept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 sm:p-8 space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedConcept(null)}
              className="absolute right-5 top-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                Course Concept &bull; Difficulty {selectedConcept.difficulty}/10
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-3">
                {selectedConcept.name}
              </h3>
            </div>

            <div className="space-y-3 text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Conceptual Overview
              </h5>
              <p>
                {selectedConcept.description || "No extended description provided for this concept."}
              </p>
            </div>

            {selectedConcept.prerequisiteConceptIds && selectedConcept.prerequisiteConceptIds.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Prerequisites
                </h5>
                <p className="text-xs text-slate-500">
                  {selectedConcept.prerequisiteConceptIds.length} prerequisite concepts mapped.
                </p>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <Link
                href={`/student/ai-tutor?courseId=${selectedCourse?.id}&conceptId=${selectedConcept.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 shadow-xs transition-colors"
              >
                <BrainCircuit className="w-4 h-4" />
                <span>Ask Agnes to Explain Concept</span>
              </Link>

              <button
                type="button"
                onClick={() => setSelectedConcept(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Diagnostic Assessment Modal ──────────────────────────────────── */}
      <DiagnosticAssessmentModal
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
        courseTitle={selectedCourse?.title}
        courseId={selectedCourse?.id}
      />
    </div>
  );
}