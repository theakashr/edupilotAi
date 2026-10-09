"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { courseService } from "@/services/courses/courseService";
import { conceptService } from "@/services/knowledge/conceptService";
import { learningService } from "@/services/learning/learningService";
import type { Course, Concept, LearningProfile, StudentActivity } from "@/types";
import {
  Sparkles,
  Flame,
  Award,
  Layers,
  BrainCircuit,
  ChevronRight,
  Activity,
} from "lucide-react";
import { DiagnosticAssessmentModal } from "@/components/student/DiagnosticAssessmentModal";
import { NoEnrolledCourses } from "@/components/student/NoEnrolledCourses";

export default function StudentProgressPage() {
  const { user, profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  // Real progress data
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [learningProfile, setLearningProfile] = useState<LearningProfile | null>(null);
  const [activities, setActivities] = useState<StudentActivity[]>([]);
  const [streakDays, setStreakDays] = useState(0);
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

  // 2. Fetch concepts, learning profile, and activities for selected course
  useEffect(() => {
    let ignore = false;

    async function loadProgressDetails() {
      if (!selectedCourse?.id || !user?.uid) return;

      try {
        setDataLoading(true);
        const courseId = selectedCourse.id;

        const [conRes, profRes, actRes] = await Promise.all([
          conceptService.listCourseConcepts(courseId),
          learningService.getLearningProfile(user.uid, courseId),
          learningService.listStudentActivities(user.uid, courseId, 50),
        ]);

        if (ignore) return;

        if (conRes.success && conRes.data) {
          setConcepts(conRes.data);
        } else {
          setConcepts([]);
        }

        if (profRes.success && profRes.data) {
          setLearningProfile(profRes.data);
        } else {
          setLearningProfile(null);
        }

        if (actRes.success && actRes.data) {
          const acts = actRes.data;
          setActivities(acts);

          // Calculate streak from activity logs
          const daysSet = new Set<string>();
          acts.forEach((act) => {
            const date = act.timestamp?.toDate ? act.timestamp.toDate() : new Date();
            daysSet.add(date.toISOString().split("T")[0]);
          });

          const sortedDays = Array.from(daysSet).sort().reverse();
          const today = new Date().toISOString().split("T")[0];
          const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

          if (!sortedDays.includes(today) && !sortedDays.includes(yesterday)) {
            setStreakDays(0);
          } else {
            let streak = 0;
            let checkDate = new Date();
            if (!sortedDays.includes(today)) {
              checkDate = new Date(Date.now() - 86400000);
            }

            while (true) {
              const dateStr = checkDate.toISOString().split("T")[0];
              if (sortedDays.includes(dateStr)) {
                streak += 1;
                checkDate = new Date(checkDate.getTime() - 86400000);
              } else {
                break;
              }
            }
            setStreakDays(streak);
          }
        } else {
          setActivities([]);
          setStreakDays(0);
        }
      } catch (err) {
        console.error("Failed to load progress details:", err);
      } finally {
        if (!ignore) setDataLoading(false);
      }
    }

    loadProgressDetails();

    return () => {
      ignore = true;
    };
  }, [selectedCourse?.id, user?.uid]);

  const hasMastery = learningProfile?.overallMastery !== undefined && learningProfile.overallMastery !== null;

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-48 bg-slate-200/80 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200/70 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 w-full bg-slate-200/80 rounded-3xl" />
      </div>
    );
  }

  // Phase E: If no courses enrolled, render real empty state
  if (courses.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
            Analytics &amp; Knowledge Index
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-2">
            Knowledge &amp; Progress
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track concept mastery, diagnostic baselines, and active learning velocity.
          </p>
        </div>

        <NoEnrolledCourses
          title="No Progress Analytics Available"
          description="You are not enrolled in any courses yet. Share your Student ID with your instructor to begin learning."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header & Course Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
            Analytics &amp; Knowledge Index
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-2">
            Knowledge &amp; Progress
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time mastery tracking across verified concepts and diagnostic calibrations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Course Switcher */}
          <div className="flex items-center gap-2">
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

          <button
            type="button"
            onClick={() => setIsDiagnosticOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium text-xs hover:bg-indigo-700 shadow-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{hasMastery ? "Recalibrate Baseline" : "Start Diagnostic"}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid - Grounded in Real Data */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Overall Baseline */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Overall Baseline</span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">
            {hasMastery ? `${learningProfile?.overallMastery}%` : "Not Assessed"}
          </p>
          <p className="text-[11px] text-slate-500">
            {hasMastery ? "Calibrated from diagnostic" : "Take diagnostic to establish"}
          </p>
        </div>

        {/* KPI 2: Concepts Tracked */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Concepts Tracked</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">
            {concepts.length}
          </p>
          <p className="text-[11px] text-slate-500">In {selectedCourse?.title} curriculum</p>
        </div>

        {/* KPI 3: Learning Streak */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Learning Streak</span>
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">
            {streakDays} Day{streakDays === 1 ? "" : "s"}
          </p>
          <p className="text-[11px] text-slate-500">
            {streakDays > 0 ? "Consecutive study days" : "Log study activity today"}
          </p>
        </div>

        {/* KPI 4: Activity Events */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Activity Log</span>
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">
            {activities.length}
          </p>
          <p className="text-[11px] text-slate-500">Logged learning events</p>
        </div>
      </div>

      {/* Main Concept Mastery Matrix */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Curriculum Concept Index ({concepts.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {hasMastery ? "Course diagnostic calibrated" : "Pending diagnostic baseline"}
          </span>
        </div>

        {dataLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-2xl" />
            ))}
          </div>
        ) : concepts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No concepts mapped for this course yet.
          </div>
        ) : (
          <div className="space-y-3">
            {concepts.map((concept) => (
              <div
                key={concept.id}
                className="p-4 rounded-2xl border border-slate-100 bg-[#FAFAFA] hover:bg-white hover:border-slate-200 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <h4 className="text-sm font-bold text-slate-900">
                      {concept.name}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1 max-w-xl">
                    {concept.description || "Core concept in verified course curriculum."}
                  </p>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
                  <span className="text-xs text-slate-400">
                    Difficulty: {concept.difficulty}/10
                  </span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                      hasMastery
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {hasMastery ? "Active Concept" : "Pending Baseline"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Diagnostic Assessment Modal */}
      <DiagnosticAssessmentModal
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
        courseTitle={selectedCourse?.title}
        courseId={selectedCourse?.id}
        onComplete={(newScore) => {
          if (selectedCourse?.id && user?.uid) {
            setLearningProfile({
              id: `${user.uid}_${selectedCourse.id}`,
              studentId: user.uid,
              courseId: selectedCourse.id,
              overallMastery: newScore,
              lastUpdatedAt: { toDate: () => new Date() } as unknown as import("firebase/firestore").Timestamp,
            });
          }
        }}
      />
    </div>
  );
}