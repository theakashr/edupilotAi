"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { courseService } from "@/services/courses/courseService";
import { materialService } from "@/services/materials/materialService";
import { conceptService } from "@/services/knowledge/conceptService";
import { learningService } from "@/services/learning/learningService";
import { assessmentService } from "@/services/assessments/assessmentService";
import type { Course, Concept, Material, LearningProfile, Assessment, AssessmentAttempt } from "@/types";
import {
  Sparkles,
  ArrowRight,
  Target,
  BrainCircuit,
  Flame,
  Clock,
  ChevronRight,
  Layers,
  Award,
  BookOpen,
} from "lucide-react";
import { TakeAssessmentModal } from "@/components/student/TakeAssessmentModal";
import { NoEnrolledCourses } from "@/components/student/NoEnrolledCourses";

export default function StudentDashboardPage() {
  const { user, profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [courseDataLoading, setCourseDataLoading] = useState(false);
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);

  // Real course-scoped data
  const [materials, setMaterials] = useState<Material[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [learningProfile, setLearningProfile] = useState<LearningProfile | null>(null);
  const [publishedAssessments, setPublishedAssessments] = useState<Assessment[]>([]);
  const [latestAttempt, setLatestAttempt] = useState<AssessmentAttempt | null>(null);
  const [streakDays, setStreakDays] = useState(0);

  // Greet based on time of day and authentic student profile
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const studentName = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Student";

  // 1. Load enrolled courses for student
  useEffect(() => {
    let ignore = false;

    async function loadStudentCourses() {
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
        console.error("Failed to load student courses:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadStudentCourses();

    return () => {
      ignore = true;
    };
  }, [user?.uid, profile?.studentId]);

  // 2. When selected course changes, load real course-scoped data in parallel
  useEffect(() => {
    let ignore = false;

    async function loadCourseDetails() {
      if (!selectedCourse?.id || !user?.uid) return;

      try {
        setCourseDataLoading(true);
        const courseId = selectedCourse.id;

        const [matRes, conRes, profRes, actRes, assRes] = await Promise.all([
          materialService.listCourseMaterials(courseId),
          conceptService.listCourseConcepts(courseId),
          learningService.getLearningProfile(user.uid, courseId),
          learningService.listStudentActivities(user.uid, courseId, 30),
          assessmentService.listCourseAssessments(courseId),
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

        if (profRes.success && profRes.data) {
          setLearningProfile(profRes.data);
        } else {
          setLearningProfile(null);
        }

        if (assRes.success && assRes.data) {
          const published = assRes.data.filter((a) => a.status === "published");
          setPublishedAssessments(published);

          // Find completed attempt
          let latestComp: AssessmentAttempt | null = null;
          for (const ass of published) {
            const attRes = await assessmentService.listStudentAttempts(ass.id, user.uid);
            if (attRes.success && attRes.data) {
              const comp = attRes.data.find((a) => a.status === "completed");
              if (comp) {
                latestComp = comp;
                break;
              }
            }
          }
          setLatestAttempt(latestComp);
        } else {
          setPublishedAssessments([]);
          setLatestAttempt(null);
        }

        if (actRes.success && actRes.data) {
          const acts = actRes.data;

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
          setStreakDays(0);
        }
      } catch (err) {
        console.error("Failed to load course details:", err);
      } finally {
        if (!ignore) setCourseDataLoading(false);
      }
    }

    loadCourseDetails();

    return () => {
      ignore = true;
    };
  }, [selectedCourse?.id, user?.uid]);

  const activeTitle = selectedCourse?.title || "My Course";
  const hasMastery = learningProfile?.overallMastery !== undefined && learningProfile.overallMastery !== null;
  const learningProgress = hasMastery ? learningProfile.overallMastery : 0;

  // Selected concepts for recommendations
  const primaryConcept = concepts.length > 0 ? concepts[0] : null;
  const secondaryConcept = concepts.length > 1 ? concepts[1] : null;

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-56 bg-slate-200/80 rounded-2xl" />
            <div className="h-4 w-40 bg-slate-100 rounded-xl" />
          </div>
          <div className="h-9 w-36 bg-slate-200/80 rounded-xl" />
        </div>
        <div className="h-72 w-full bg-slate-200/80 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 h-44 bg-slate-200/70 rounded-2xl" />
          <div className="h-44 bg-slate-200/70 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Phase E: If no courses enrolled, render real empty state with student ID
  if (courses.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {greeting}, {studentName} <span className="inline-block animate-bounce">👋</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome to EduPilot AI. Your active learning dashboard will appear once enrolled.
          </p>
        </div>

        <NoEnrolledCourses
          title="No Enrolled Courses"
          description="You are currently not enrolled in any published courses. Provide your unique Student ID to your instructor to get enrolled."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ─── Header: Greeting & Course Selector ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {greeting}, {studentName} <span className="inline-block animate-bounce">👋</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Your personalized learning workspace.
          </p>
        </div>

        {/* Current Course Selector */}
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

      {/* ─── Hero Learning Card ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white p-6 sm:p-9 shadow-xl shadow-indigo-950/15 border border-indigo-800/40 group">
        {/* Subtle background glow orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 animate-orb" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-violet-600/15 rounded-full blur-2xl pointer-events-none -mb-10" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-semibold tracking-wider uppercase text-indigo-200 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              Active Course Curriculum
            </div>

            <div>
              <span className="text-xs uppercase font-medium tracking-wider text-indigo-300 block mb-1">
                {selectedCourse?.subject || "Curriculum"}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {activeTitle}
              </h2>
              <p className="text-sm text-indigo-100/80 mt-1.5 leading-relaxed max-w-xl">
                {selectedCourse?.description || "Course materials, verified concepts, and adaptive evaluations."}
              </p>
            </div>

            {/* Genuine Progress Segment */}
            <div className="space-y-2 max-w-md pt-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-indigo-200">
                  {hasMastery ? "Calibrated Mastery" : "Progress Status"}
                </span>
                <span className="text-white font-mono">
                  {hasMastery ? `${learningProgress}%` : "Not yet assessed"}
                </span>
              </div>
              <div className="w-full bg-white/15 h-2 rounded-full overflow-hidden backdrop-blur-sm">
                <div
                  className="h-full bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-400 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${learningProgress}%` }}
                />
              </div>
              {!hasMastery && (
                <p className="text-[11px] text-indigo-200/70">
                  Take the course diagnostic baseline to calculate your genuine mastery score.
                </p>
              )}
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/student/learning"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-indigo-950 font-semibold text-sm hover:bg-indigo-50 shadow-md shadow-black/20 transition-all hover:gap-3 group-hover:shadow-indigo-500/20"
              >
                <BookOpen className="w-4 h-4 text-indigo-800" />
                <span>Open Course Materials</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>

              {publishedAssessments.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setActiveAssessmentId(publishedAssessments[0].id)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-md border border-white/10 transition-colors"
                >
                  <Award className="w-4 h-4 text-indigo-300" />
                  <span>{latestAttempt ? "Review Diagnostic" : "Start Diagnostic"}</span>
                </button>
              ) : (
                <Link
                  href="/student/assessments"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-md border border-white/10 transition-colors"
                >
                  <Award className="w-4 h-4 text-indigo-300" />
                  <span>View Assessments</span>
                </Link>
              )}
            </div>
          </div>

          {/* Futuristic Abstract Visual with Real Counts */}
          <div className="lg:col-span-4 flex items-center justify-center">
            <div className="relative w-48 h-48 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md p-4 flex flex-col items-center justify-center text-center shadow-inner group-hover:border-indigo-400/40 transition-colors">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-white mb-3 shadow-lg shadow-indigo-500/30">
                <BrainCircuit className="w-8 h-8 text-white" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                Course Knowledge Base
              </span>
              <span className="text-[11px] text-slate-300 mt-1">
                {concepts.length} {concepts.length === 1 ? "Concept" : "Concepts"} &bull; {materials.length} {materials.length === 1 ? "Material" : "Materials"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Today's Focus & Quick Actions ───────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Your focus today</h3>
          </div>
          <span className="text-xs font-medium text-slate-400">Curriculum Grounded</span>
        </div>

        {courseDataLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
            <div className="md:col-span-2 h-36 bg-slate-100 rounded-2xl" />
            <div className="h-36 bg-slate-100 rounded-2xl" />
          </div>
        ) : concepts.length === 0 ? (
          materials.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {materials.slice(0, 2).map((mat) => (
                <div
                  key={mat.id}
                  className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                        📚 Course Material ({mat.type.toUpperCase()})
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        Verified
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                      {mat.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                      {mat.description || `${mat.fileName} • Uploaded by course instructor.`}
                    </p>
                  </div>
                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {mat.fileName}
                    </span>
                    <Link
                      href="/student/learning"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      <span>Read Document →</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-slate-200/80 p-6 text-center shadow-xs">
              <p className="text-sm font-semibold text-slate-700">No concepts or materials mapped yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Your instructor is preparing verified curriculum materials and concepts.
              </p>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Main Focus Card */}
            {primaryConcept && (
              <div className="md:col-span-2 rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                      🎯 Primary Topic
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      Difficulty: {primaryConcept.difficulty}/10
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900">
                    {primaryConcept.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                    {primaryConcept.description || "Core foundational concept verified from course learning materials."}
                  </p>
                </div>

                <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Course: {selectedCourse?.title}
                  </span>
                  <Link
                    href="/student/learning"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 group"
                  >
                    <span>View in My Learning</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            )}

            {/* Quick Review Card */}
            <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                    ⚡ {secondaryConcept ? "Next Concept" : "Curriculum Resource"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    Review
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  {secondaryConcept ? secondaryConcept.name : materials.length > 0 ? materials[0].title : "Course Materials"}
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                  {secondaryConcept?.description || (materials.length > 0 ? `Instructor uploaded material: ${materials[0].title}` : "Instructor verified curriculum content.")}
                </p>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-end">
                <Link
                  href="/student/learning"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                >
                  <span>Review now →</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Two-Column: Learning Progress & Diagnostic Card ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Knowledge Map & Progress */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Your Learning Map</h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200/60">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{streakDays} Day{streakDays === 1 ? "" : "s"} Streak</span>
            </div>
          </div>

          {concepts.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No concepts published for this course yet.
            </div>
          ) : (
            <div className="space-y-3">
              {concepts.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl border border-slate-100 bg-[#FAFAFA] hover:bg-white hover:border-slate-200 hover:shadow-xs transition-all flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <div>
                      <h5 className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {item.name}
                      </h5>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <span>Difficulty: {item.difficulty}/10</span>
                        {item.prerequisiteConceptIds && item.prerequisiteConceptIds.length > 0 && (
                          <span>&bull; {item.prerequisiteConceptIds.length} Prerequisites</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border text-indigo-700 bg-indigo-50 border-indigo-200">
                      Active Concept
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
            <span>
              {hasMastery ? "Calibrated from your diagnostic" : "Take diagnostic to calculate mastery"}
            </span>
            <Link
              href="/student/progress"
              className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Full Analytics</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Diagnostic Assessment Card */}
        <div className="lg:col-span-5 rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-violet-50/70 p-6 sm:p-7 border border-indigo-100/90 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/80 px-2.5 py-1 rounded-lg">
              <Award className="w-3.5 h-3.5 text-indigo-600" />
              Course Baseline Assessment
            </span>

            <div>
              <h3 className="text-xl font-bold text-slate-900">
                {publishedAssessments.length > 0
                  ? publishedAssessments[0].title
                  : `${activeTitle} Diagnostic`}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {publishedAssessments.length > 0
                  ? publishedAssessments[0].instructions ||
                    "Calibrate your baseline understanding across key course concepts. Interactive evaluations with objective concept diagnosis."
                  : `Your baseline knowledge profile will appear after your instructor publishes your first course diagnostic assessment.`}
              </p>
            </div>

            {publishedAssessments.length > 0 ? (
              <div className="space-y-2 py-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <span>{publishedAssessments[0].questions?.length || 0} questions</span>
                </div>
                {publishedAssessments[0].durationMinutes && (
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span>Takes ~{publishedAssessments[0].durationMinutes} minutes</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <span>
                    {latestAttempt
                      ? `Verified Score: ${latestAttempt.percentage}%`
                      : "Not yet completed"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white/80 border border-slate-200 text-xs text-slate-500">
                No active diagnostic published yet for this course. Check back soon or visit Assessments.
              </div>
            )}
          </div>

          <div className="pt-6">
            {publishedAssessments.length > 0 ? (
              <button
                type="button"
                onClick={() => setActiveAssessmentId(publishedAssessments[0].id)}
                className="w-full py-3 px-4 rounded-2xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{latestAttempt ? "Review Diagnostic" : "Start Diagnostic"}</span>
              </button>
            ) : (
              <Link
                href="/student/assessments"
                className="w-full py-3 px-4 rounded-2xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                <span>Go to Assessments</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ─── Real Diagnostic Assessment Engine Modal ───────────────────────── */}
      {activeAssessmentId && (
        <TakeAssessmentModal
          isOpen={true}
          onClose={() => setActiveAssessmentId(null)}
          assessmentId={activeAssessmentId}
          courseTitle={activeTitle}
          onCompleted={() => {
            if (selectedCourse?.id && user?.uid) {
              const courseId = selectedCourse.id;
              Promise.all([
                learningService.getLearningProfile(user.uid, courseId),
                assessmentService.listCourseAssessments(courseId),
              ]).then(([profRes, assRes]) => {
                if (profRes.success && profRes.data) {
                  setLearningProfile(profRes.data);
                }
                if (assRes.success && assRes.data) {
                  const published = assRes.data.filter((a) => a.status === "published");
                  setPublishedAssessments(published);
                }
              });
            }
          }}
        />
      )}
    </div>
  );
}