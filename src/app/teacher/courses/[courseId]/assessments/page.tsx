"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { courseService } from "@/services/courses/courseService";
import { assessmentService } from "@/services/assessments/assessmentService";
import { conceptService } from "@/services/knowledge/conceptService";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { CourseWorkspaceNav } from "@/components/teacher/CourseWorkspaceNav";
import { CreateAssessmentModal } from "@/components/teacher/assessments/CreateAssessmentModal";
import { PreviewAssessmentModal } from "@/components/teacher/assessments/PreviewAssessmentModal";
import { AssessmentResultsModal } from "@/components/teacher/assessments/AssessmentResultsModal";
import type { Course, Assessment, Concept } from "@/types";
import {
  CheckSquare,
  Plus,
  Clock,
  Award,
  Eye,
  BarChart3,
  ShieldAlert,
  Trash2,
  BookOpen,
} from "lucide-react";

interface PageProps {
  params: Promise<{ courseId: string }>;
}

export default function CourseAssessmentsPage({ params }: PageProps) {
  const { courseId } = use(params);
  const { user, profile } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccessDenied, setIsAccessDenied] = useState(false);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [previewAssessment, setPreviewAssessment] = useState<Partial<Assessment> | null>(null);
  const [resultsAssessment, setResultsAssessment] = useState<Assessment | null>(null);

  // Filter tabs
  const [filterTab, setFilterTab] = useState<"all" | "published" | "draft">("all");

  useEffect(() => {
    async function loadWorkspaceData() {
      if (!courseId || !user?.uid) return;

      try {
        setLoading(true);
        setError(null);
        setIsAccessDenied(false);

        // 1. Fetch Course details & check ownership
        const courseRes = await courseService.getCourseById(courseId);
        if (!courseRes.success) {
          setError(courseRes.error);
          setLoading(false);
          return;
        }

        const courseData = courseRes.data;
        if (!courseData) {
          setError("Course not found.");
          setLoading(false);
          return;
        }
        if (courseData.teacherId !== user.uid) {
          setIsAccessDenied(true);
          setLoading(false);
          return;
        }

        setCourse(courseData);

        // 2. Fetch Assessments & Concepts in parallel
        const [assRes, conRes] = await Promise.all([
          assessmentService.listCourseAssessments(courseId),
          conceptService.listCourseConcepts(courseId),
        ]);

        if (assRes.success && assRes.data) {
          setAssessments(assRes.data);
        } else {
          setAssessments([]);
        }

        if (conRes.success && conRes.data) {
          setConcepts(conRes.data);
        } else {
          setConcepts([]);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load assessments.");
      } finally {
        setLoading(false);
      }
    }

    loadWorkspaceData();
  }, [courseId, user?.uid]);

  const handleTogglePublish = async (assessment: Assessment) => {
    const newStatus = assessment.status === "published" ? "draft" : "published";
    try {
      const res = await assessmentService.updateAssessment(assessment.id, {
        status: newStatus,
      });
      if (res.success) {
        setAssessments((prev) =>
          prev.map((a) => (a.id === assessment.id ? { ...a, status: newStatus } : a))
        );
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteAssessment = async (assessmentId: string) => {
    if (!confirm("Are you sure you want to delete this assessment?")) return;
    try {
      const res = await assessmentService.deleteAssessment(assessmentId);
      if (res.success) {
        setAssessments((prev) => prev.filter((a) => a.id !== assessmentId));
      }
    } catch {
      // ignore
    }
  };

  // Unauthorized or Error State
  if (isAccessDenied || error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <TeacherNav />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md w-full text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              {isAccessDenied ? "Access Denied" : "Error"}
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              {isAccessDenied
                ? "You do not have permission to view or manage assessments for this course. Only the authorized teacher can manage course assessments."
                : error || "Failed to load course assessments."}
            </p>
            <div className="mt-6">
              <Link
                href="/teacher/courses"
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
              >
                Back to My Courses
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const filteredAssessments = assessments.filter((a) => {
    if (filterTab === "published") return a.status === "published";
    if (filterTab === "draft") return a.status === "draft";
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TeacherNav />

      {course && <CourseWorkspaceNav course={course} />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header & New Assessment Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                Evaluations &amp; Calibrations
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {course?.title}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Course Diagnostic Assessments
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Create, configure, and review diagnostic evaluations to calibrate each student&apos;s baseline knowledge.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 transition-all hover:scale-[1.01] shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Diagnostic Assessment</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setFilterTab("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterTab === "all"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All ({assessments.length})
          </button>
          <button
            onClick={() => setFilterTab("published")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterTab === "published"
                ? "bg-emerald-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Published ({assessments.filter((a) => a.status === "published").length})
          </button>
          <button
            onClick={() => setFilterTab("draft")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterTab === "draft"
                ? "bg-amber-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Drafts ({assessments.filter((a) => a.status === "draft").length})
          </button>
        </div>

        {/* Assessments List / Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
            <div className="h-44 bg-slate-100 rounded-3xl" />
            <div className="h-44 bg-slate-100 rounded-3xl" />
          </div>
        ) : filteredAssessments.length === 0 ? (
          <div className="p-12 rounded-3xl bg-white border border-slate-200 text-center shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {filterTab === "all"
                  ? "No Assessments Created Yet"
                  : `No ${filterTab} assessments found.`}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                Diagnostic assessments measure students&apos; incoming mastery across approved course concepts before personalized recommendations begin.
              </p>
            </div>
            {filterTab === "all" && (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Assessment</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAssessments.map((ass) => {
              const questionCount = ass.questions?.length || 0;

              return (
                <div
                  key={ass.id}
                  className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                          {ass.type || "Diagnostic"}
                        </span>
                        <span className="text-[10px] font-semibold capitalize text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          {ass.difficulty || "medium"}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                          ass.status === "published"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {ass.status}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {ass.title}
                    </h3>

                    {ass.instructions && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {ass.instructions}
                      </p>
                    )}

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-4 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        <span>{questionCount} {questionCount === 1 ? "Question" : "Questions"}</span>
                      </div>
                      {ass.durationMinutes && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{ass.durationMinutes} min</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-slate-400" />
                        <span>{ass.totalMarks} Marks</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewAssessment(ass)}
                        className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                        title="Preview Student Experience"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteAssessment(ass.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete Assessment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(ass)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          ass.status === "published"
                            ? "border-slate-200 text-slate-600 hover:bg-slate-100"
                            : "bg-emerald-600 text-white border-transparent hover:bg-emerald-700 shadow-xs"
                        }`}
                      >
                        {ass.status === "published" ? "Unpublish to Draft" : "Publish"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setResultsAssessment(ass)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-xs transition-all"
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>View Results</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Assessment Modal */}
      {course && (
        <CreateAssessmentModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          courseId={course.id}
          courseTitle={course.title}
          teacherId={user?.uid || ""}
          teacherName={profile?.displayName || user?.displayName || undefined}
          concepts={concepts}
          onCreated={(newAss) => {
            setAssessments((prev) => [newAss, ...prev]);
          }}
          onPreview={(draft) => {
            setPreviewAssessment(draft);
          }}
        />
      )}

      {/* Preview Assessment Modal */}
      {previewAssessment && (
        <PreviewAssessmentModal
          isOpen={true}
          onClose={() => setPreviewAssessment(null)}
          assessment={previewAssessment}
        />
      )}

      {/* Assessment Results Modal */}
      {resultsAssessment && (
        <AssessmentResultsModal
          isOpen={true}
          onClose={() => setResultsAssessment(null)}
          assessment={resultsAssessment}
        />
      )}
    </div>
  );
}
