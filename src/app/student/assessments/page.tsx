"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { courseService } from "@/services/courses/courseService";
import { assessmentService } from "@/services/assessments/assessmentService";
import type { Course, Assessment, AssessmentAttempt } from "@/types";
import {
  Award,
  Sparkles,
  Clock,
  ArrowRight,
  BookOpen,
  ChevronRight,
  CheckCircle2,
  Calendar,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { TakeAssessmentModal } from "@/components/student/TakeAssessmentModal";
import { NoEnrolledCourses } from "@/components/student/NoEnrolledCourses";

export default function StudentAssessmentsPage() {
  const { user, profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);

  // Real assessments and student attempts
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [attemptsMap, setAttemptsMap] = useState<Record<string, AssessmentAttempt[]>>({});
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);

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
        console.error("Failed to load courses:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadCourses();

    return () => {
      ignore = true;
    };
  }, [user?.uid, profile?.studentId]);

  const [refreshKey, setRefreshKey] = useState(0);

  // 2. Fetch assessments and student attempts for selected course
  useEffect(() => {
    let ignore = false;

    async function loadAssessmentsAndAttempts() {
      if (!selectedCourse?.id || !user?.uid) return;

      try {
        setAssessmentsLoading(true);
        const courseId = selectedCourse.id;

        // Fetch published course assessments
        const assRes = await assessmentService.listPublishedCourseAssessments(courseId);
        if (ignore) return;
        const published =
          assRes.success && assRes.data
            ? assRes.data
            : [];

        setAssessments(published);

        // Fetch student attempts for each published assessment
        const newAttemptsMap: Record<string, AssessmentAttempt[]> = {};
        await Promise.all(
          published.map(async (ass) => {
            const attRes = await assessmentService.listStudentAttempts(ass.id, user.uid);
            newAttemptsMap[ass.id] = attRes.success && attRes.data ? attRes.data : [];
          })
        );

        if (ignore) return;
        setAttemptsMap(newAttemptsMap);
      } catch (err) {
        console.error("Failed to load assessments:", err);
      } finally {
        if (!ignore) {
          setAssessmentsLoading(false);
        }
      }
    }

    loadAssessmentsAndAttempts();

    return () => {
      ignore = true;
    };
  }, [selectedCourse?.id, user?.uid, refreshKey]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-48 bg-slate-200/80 rounded-2xl" />
        <div className="h-64 w-full bg-slate-200/80 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-44 bg-slate-200/70 rounded-2xl" />
          <div className="h-44 bg-slate-200/70 rounded-2xl" />
        </div>
      </div>
    );
  }

  // If no courses enrolled, render empty state
  if (courses.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
            Evaluations &amp; Calibrations
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-2">
            Assessments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Access course quizzes, diagnostic assessments, and mastery evaluations.
          </p>
        </div>

        <NoEnrolledCourses
          title="No Assessments Available"
          description="You are not enrolled in any active courses. Enroll through your instructor to access course quizzes and diagnostics."
        />
      </div>
    );
  }

  // Find featured diagnostic assessment (if any published)
  const featuredDiagnostic = assessments.find((a) => a.type === "diagnostic") || assessments[0];
  const featuredAttempts = featuredDiagnostic ? attemptsMap[featuredDiagnostic.id] || [] : [];
  const latestFeaturedAttempt = featuredAttempts.find((a) => a.status === "completed");

  // Collect all completed attempts across assessments
  const allCompletedAttempts: {
    id: string;
    title: string;
    score?: number;
    totalMarks?: number;
    percentage?: number;
    submittedAt?: string;
  }[] = [];

  Object.entries(attemptsMap).forEach(([assId, attList]) => {
    const parentAss = assessments.find((a) => a.id === assId);
    attList.forEach((att) => {
      if (att.status === "completed" && att.percentage !== undefined) {
        allCompletedAttempts.push({
          id: att.id,
          title: parentAss?.title || "Assessment",
          score: att.score,
          totalMarks: att.totalMarks || parentAss?.totalMarks,
          percentage: att.percentage,
          submittedAt: att.submittedAt?.toDate
            ? att.submittedAt.toDate().toLocaleDateString()
            : "Recently",
        });
      }
    });
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header & Course Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
            Evaluations &amp; Calibrations
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-2">
            Assessments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Calibrate conceptual mastery and review verified checkpoint evaluations.
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

      {/* Featured Diagnostic Banner Card */}
      {featuredDiagnostic ? (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white p-6 sm:p-9 shadow-xl border border-indigo-800/40">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[11px] font-semibold tracking-wider uppercase text-indigo-200 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              {featuredDiagnostic.type === "diagnostic" ? "Diagnostic Baseline" : "Featured Assessment"}
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {featuredDiagnostic.title}
              </h2>
              <p className="text-xs sm:text-sm text-indigo-200/80 mt-1 leading-relaxed">
                {featuredDiagnostic.instructions ||
                  `Measure your understanding across core concepts in ${selectedCourse?.title}. Deterministic evaluations to calculate your genuine baseline.`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs text-indigo-200 pt-1">
              {featuredDiagnostic.durationMinutes && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-300" />
                  <span>~{featuredDiagnostic.durationMinutes} minutes</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-300" />
                <span>{featuredDiagnostic.questions?.length || 0} questions</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-indigo-300" />
                <span>
                  {latestFeaturedAttempt
                    ? `Calibrated Score: ${latestFeaturedAttempt.percentage}%`
                    : "Not yet completed"}
                </span>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={() => setActiveAssessmentId(featuredDiagnostic.id)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-indigo-950 font-semibold text-sm hover:bg-indigo-50 shadow-md transition-all hover:gap-3"
              >
                <span>
                  {latestFeaturedAttempt ? "View Diagnostic Results" : "Start Diagnostic"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl bg-slate-900 text-white p-8 text-center space-y-3">
          <Sparkles className="w-8 h-8 text-indigo-400 mx-auto" />
          <h3 className="text-xl font-bold">No Diagnostic Assessments Published Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Your instructor for {selectedCourse?.title} has not published a diagnostic assessment yet. Your baseline knowledge profile will appear after your first assessment.
          </p>
        </div>
      )}

      {/* Available Published Assessments Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            Available Assessments ({assessments.length})
          </h3>
          <span className="text-xs text-slate-400">Published by instructor</span>
        </div>

        {assessmentsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
            <div className="h-36 bg-slate-100 rounded-2xl" />
            <div className="h-36 bg-slate-100 rounded-2xl" />
          </div>
        ) : assessments.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200/80 p-8 text-center shadow-xs space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No Assessments Available</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No assessments are currently published for {selectedCourse?.title}. When your instructor publishes quizzes or diagnostics, they will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assessments.map((ass) => {
              const attempts = attemptsMap[ass.id] || [];
              const latestAttempt = attempts.find((a) => a.status === "completed") || attempts[0];
              const isCompleted = latestAttempt?.status === "completed";

              return (
                <div
                  key={ass.id}
                  className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                          {ass.type || "Quiz"} &bull; {ass.difficulty || "medium"}
                        </span>
                        {ass.teacherName && (
                          <span className="text-[10px] text-slate-400">
                            By {ass.teacherName}
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isCompleted
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        }`}
                      >
                        {isCompleted ? "Completed" : "Available"}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900">
                      {ass.title}
                    </h4>

                    {ass.instructions && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {ass.instructions}
                      </p>
                    )}

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        <span>{ass.questions?.length || 0} Questions</span>
                      </div>
                      {ass.durationMinutes && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{ass.durationMinutes} min</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-slate-400" />
                        <span>{ass.totalMarks} Marks</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Result Display */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      {isCompleted ? (
                        <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Score: {latestAttempt.percentage}%</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Not attempted yet
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveAssessmentId(ass.id)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isCompleted
                          ? "border border-slate-200 text-slate-700 hover:bg-slate-50"
                          : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>View Result</span>
                        </>
                      ) : (
                        <>
                          <span>Start Assessment</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Real Past Completed Attempts History */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 tracking-tight">
          Completed Attempts &amp; Results ({allCompletedAttempts.length})
        </h3>

        {allCompletedAttempts.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200/80 p-6 text-center text-slate-400 text-xs shadow-xs">
            No completed assessments recorded yet. Take an assessment to record your verified diagnostic baseline.
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden shadow-xs divide-y divide-slate-100">
            {allCompletedAttempts.map((att) => (
              <div
                key={att.id}
                className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900">{att.title}</h5>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>{att.submittedAt}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-lg font-extrabold text-slate-900">
                    {att.percentage}%
                  </span>
                  <p className="text-[11px] text-emerald-600 font-semibold">Verified</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Assessment Taking Modal */}
      {activeAssessmentId && (
        <TakeAssessmentModal
          isOpen={true}
          onClose={() => setActiveAssessmentId(null)}
          assessmentId={activeAssessmentId}
          courseTitle={selectedCourse?.title}
          onCompleted={() => {
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}