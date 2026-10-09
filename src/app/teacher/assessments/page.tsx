"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { assessmentService } from "@/services/assessments/assessmentService";
import { courseService } from "@/services/courses/courseService";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { AssessmentResultsModal } from "@/components/teacher/assessments/AssessmentResultsModal";
import type { Assessment, Course } from "@/types";
import {
  CheckSquare,
  ArrowRight,
  BarChart3,
} from "lucide-react";

export default function TeacherAssessmentsOverviewPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultsAssessment, setResultsAssessment] = useState<Assessment | null>(null);

  useEffect(() => {
    async function loadAllAssessments() {
      if (!user?.uid) return;

      try {
        setLoading(true);
        const [coursesRes, assRes] = await Promise.all([
          courseService.listTeacherCourses(user.uid),
          assessmentService.listTeacherAssessments(user.uid),
        ]);

        if (coursesRes.success && coursesRes.data) {
          setCourses(coursesRes.data);
        }

        if (assRes.success && assRes.data) {
          setAssessments(assRes.data);
        }
      } catch (err) {
        console.error("Failed to load teacher assessments:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAllAssessments();
  }, [user?.uid]);

  const courseTitleMap = new Map<string, string>();
  courses.forEach((c) => courseTitleMap.set(c.id, c.title));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TeacherNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
            Instructional Overview
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
            All Course Assessments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Overview of diagnostic evaluations and checkpoints across your curriculum workspaces.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
            <div className="h-44 bg-slate-100 rounded-3xl" />
            <div className="h-44 bg-slate-100 rounded-3xl" />
          </div>
        ) : assessments.length === 0 ? (
          <div className="p-12 rounded-3xl bg-white border border-slate-200 text-center shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                No Assessments Created Yet
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Navigate to any of your course workspaces to create diagnostic evaluations and checkpoints.
              </p>
            </div>
            {courses.length > 0 && (
              <div className="pt-2">
                <Link
                  href={`/teacher/courses/${courses[0].id}/assessments`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-xs transition-all"
                >
                  <span>Go to {courses[0].title} Assessments</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assessments.map((ass) => {
              const courseTitle =
                courseTitleMap.get(ass.courseId) || ass.courseTitle || "Course";

              return (
                <div
                  key={ass.id}
                  className="rounded-3xl bg-white border border-slate-200 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                        {courseTitle} &bull; {ass.type}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          ass.status === "published"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {ass.status}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900">{ass.title}</h3>

                    {ass.instructions && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {ass.instructions}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
                      <span>{ass.questions?.length || 0} Questions</span>
                      {ass.durationMinutes && <span>{ass.durationMinutes} min</span>}
                      <span>{ass.totalMarks} Marks</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setResultsAssessment(ass)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>View Results</span>
                    </button>

                    <Link
                      href={`/teacher/courses/${ass.courseId}/assessments`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
                    >
                      <span>Manage in Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

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