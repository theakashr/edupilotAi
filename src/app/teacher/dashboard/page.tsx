"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { courseService } from "@/services/courses/courseService";
import { materialService } from "@/services/materials/materialService";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import type { Course, Material, MaterialStatus } from "@/types";
import {
  BookOpen,
  Users,
  FileText,
  Plus,
  ArrowRight,
  Clock,
  Sparkles,
  AlertCircle,
  FolderGit2,
  CheckCircle2,
  FileCode,
  FileSpreadsheet,
  File,
  Layers,
} from "lucide-react";

export default function TeacherDashboard() {
  const { profile, user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseCounts, setCourseCounts] = useState<
    Record<string, { students: number; materials: number }>
  >({});
  const [recentMaterials, setRecentMaterials] = useState<Material[]>([]);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [totalMaterials, setTotalMaterials] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      if (!user?.uid) return;
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch Teacher's Courses
        const coursesRes = await courseService.listTeacherCourses(user.uid, 50);
        if (!coursesRes.success) {
          setError(coursesRes.error);
          setLoading(false);
          return;
        }

        const teacherCourses = coursesRes.data;
        setCourses(teacherCourses);

        // 2. Fetch Enrolled Students Count, Materials and Counts per Course
        if (teacherCourses.length > 0) {
          let enrolledCount = 0;
          let allMaterialsCount = 0;
          const materialsList: Material[] = [];
          const countsMap: Record<string, { students: number; materials: number }> = {};

          await Promise.all(
            teacherCourses.map(async (c) => {
              const [membersRes, materialsRes] = await Promise.all([
                courseService.listCourseMembers(c.id),
                materialService.listCourseMaterials(c.id),
              ]);

              const sCount = membersRes.success ? membersRes.data.length : 0;
              const mCount = materialsRes.success ? materialsRes.data.length : 0;

              countsMap[c.id] = { students: sCount, materials: mCount };
              enrolledCount += sCount;
              allMaterialsCount += mCount;

              if (materialsRes.success) {
                materialsList.push(...materialsRes.data);
              }
            })
          );

          setCourseCounts(countsMap);
          setTotalStudents(enrolledCount);
          setTotalMaterials(allMaterialsCount);

          // Sort materials by createdAt descending and take top 5
          materialsList.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
          });

          setRecentMaterials(materialsList.slice(0, 5));
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user?.uid]);

  // Lookup map for course titles by id
  const coursesMap = useMemo(() => {
    const map: Record<string, Course> = {};
    for (const c of courses) {
      map[c.id] = c;
    }
    return map;
  }, [courses]);

  const activeCoursesCount = courses.filter((c) => c.status === "active").length;
  const teacherFirstName = profile?.displayName
    ? profile.displayName.split(" ")[0]
    : user?.displayName
    ? user.displayName.split(" ")[0]
    : "Teacher";

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col font-sans selection:bg-indigo-500/20 selection:text-indigo-900">
      <TeacherNav />

      <main id="main-content" className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Error Banner */}
        {error && (
          <div
            role="alert"
            className="mb-8 p-4 rounded-2xl bg-rose-50/90 text-rose-800 text-sm flex items-start gap-3 border border-rose-200/80 shadow-xs backdrop-blur-xs"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-semibold">Unable to load dashboard data</p>
              <p className="text-xs text-rose-600/90 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Section 1: Hero Section with AI Visual */}
        <section
          aria-labelledby="teacher-hero-heading"
          className="relative mb-8 rounded-3xl bg-linear-to-br from-white via-slate-50/90 to-indigo-50/40 border border-slate-200/80 p-6 sm:p-8 lg:p-10 shadow-xs overflow-hidden"
        >
          {/* Subtle decorative glow orb */}
          <div
            className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-20 -left-20 w-80 h-80 bg-violet-400/10 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            {/* Left Content */}
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50/90 border border-indigo-100/90 text-indigo-700 text-xs font-semibold tracking-wide uppercase mb-3.5 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
                <span>EduPilot AI · Teacher Workspace</span>
              </div>

              <h1
                id="teacher-hero-heading"
                className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight"
              >
                Welcome back, {teacherFirstName}
              </h1>

              <p className="mt-2 text-base sm:text-lg font-medium text-slate-700">
                Your teaching workspace is ready.
              </p>

              <p className="mt-1 text-sm text-slate-500 max-w-xl leading-relaxed">
                Manage your courses, learning materials, and students in one intelligent workspace.
              </p>

              {/* Quick Call to Action */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/teacher/courses/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 active:scale-[0.98] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>Create Course</span>
                </Link>

                <Link
                  href="/teacher/courses"
                  className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 border border-slate-200/90 shadow-2xs hover:border-slate-300 active:scale-[0.98] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  <BookOpen className="w-4 h-4 text-slate-500" aria-hidden="true" />
                  <span>View All Courses</span>
                </Link>
              </div>
            </div>

            {/* Right Abstract AI Visual */}
            <div
              className="hidden lg:flex items-center justify-center shrink-0 pr-4 select-none"
              aria-hidden="true"
            >
              <div className="relative w-56 h-56 flex items-center justify-center">
                {/* Outer Ring */}
                <div className="absolute inset-0 rounded-full border border-indigo-200/60 border-dashed animate-[spin_60s_linear_infinite]" />
                
                {/* Inner Pulsing Orb */}
                <div className="w-36 h-36 rounded-full bg-linear-to-tr from-indigo-500/20 via-violet-500/20 to-indigo-600/10 backdrop-blur-md border border-indigo-300/40 flex items-center justify-center shadow-lg shadow-indigo-500/10 animate-orb">
                  <div className="w-20 h-20 rounded-full bg-linear-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-600/30">
                    <Sparkles className="w-9 h-9 text-white" />
                  </div>
                </div>

                {/* Floating Connected Nodes */}
                <div className="absolute top-2 left-6 px-2.5 py-1 rounded-full bg-white/95 border border-indigo-100 shadow-xs text-[10px] font-semibold text-indigo-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Agnes Co-Pilot
                </div>
                <div className="absolute bottom-4 right-4 px-2.5 py-1 rounded-full bg-white/95 border border-indigo-100 shadow-xs text-[10px] font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  Source Trust Active
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Metric Cards Grid */}
        <section aria-label="Key workspace statistics" className="mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Total Courses Metric */}
            <div className="group rounded-2xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-xs hover:-translate-y-1 hover:shadow-md hover:border-indigo-200/80 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform duration-200">
                  <BookOpen className="w-5 h-5" aria-hidden="true" />
                </div>
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50/80 px-2.5 py-0.5 rounded-full border border-indigo-100/70">
                  {loading ? "..." : `${activeCoursesCount} Active`}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total Courses
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    {loading ? (
                      <span className="inline-block w-8 h-8 rounded-md bg-slate-200 animate-pulse" />
                    ) : (
                      courses.length
                    )}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">workspaces created</span>
                </div>
              </div>
            </div>

            {/* Enrolled Students Metric */}
            <div className="group rounded-2xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-xs hover:-translate-y-1 hover:shadow-md hover:border-emerald-200/80 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform duration-200">
                  <Users className="w-5 h-5" aria-hidden="true" />
                </div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50/80 px-2.5 py-0.5 rounded-full border border-emerald-100/70">
                  Enrolled
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total Students
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    {loading ? (
                      <span className="inline-block w-8 h-8 rounded-md bg-slate-200 animate-pulse" />
                    ) : (
                      totalStudents
                    )}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">across all courses</span>
                </div>
              </div>
            </div>

            {/* Learning Materials Metric */}
            <div className="group rounded-2xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-xs hover:-translate-y-1 hover:shadow-md hover:border-violet-200/80 transition-all duration-200 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-violet-50 border border-violet-100/80 flex items-center justify-center text-violet-600 group-hover:scale-105 transition-transform duration-200">
                  <FileText className="w-5 h-5" aria-hidden="true" />
                </div>
                <span className="text-xs font-semibold text-violet-700 bg-violet-50/80 px-2.5 py-0.5 rounded-full border border-violet-100/70">
                  AI Ready
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Learning Materials
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    {loading ? (
                      <span className="inline-block w-8 h-8 rounded-md bg-slate-200 animate-pulse" />
                    ) : (
                      totalMaterials
                    )}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">textbooks &amp; docs indexed</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Main Two-Column Layout (Courses & Aside) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Your Courses (2 cols) */}
          <section aria-labelledby="courses-heading" className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 id="courses-heading" className="text-lg font-bold text-slate-900 tracking-tight">
                  Your Course Workspaces
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage curriculum, course materials, and student cohorts
                </p>
              </div>

              {courses.length > 0 && (
                <Link
                  href="/teacher/courses"
                  className="group inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 p-1 rounded-md transition-colors"
                >
                  <span>View all ({courses.length})</span>
                  <ArrowRight
                    className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
                    aria-hidden="true"
                  />
                </Link>
              )}
            </div>

            {/* Courses Content */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <div className="w-16 h-5 bg-slate-200 rounded animate-pulse" />
                      <div className="w-14 h-5 bg-slate-200 rounded animate-pulse" />
                    </div>
                    <div className="w-3/4 h-5 bg-slate-200 rounded animate-pulse" />
                    <div className="w-full h-10 bg-slate-100 rounded animate-pulse" />
                    <div className="pt-3 border-t border-slate-100 flex justify-between">
                      <div className="w-20 h-4 bg-slate-200 rounded animate-pulse" />
                      <div className="w-24 h-4 bg-slate-200 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : courses.length === 0 ? (
              <div className="rounded-2xl bg-white border border-dashed border-slate-300 p-10 sm:p-12 text-center shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-3.5">
                  <BookOpen className="w-6 h-6" aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  No courses created yet
                </h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                  Start by creating your first course workspace. You will be able to upload PDF
                  textbooks, view Agnes AI insights, and organize students.
                </p>
                <div className="mt-5">
                  <Link
                    href="/teacher/courses/new"
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 active:scale-[0.98] transition-all"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    <span>Create Your First Course</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {courses.slice(0, 4).map((course) => {
                  const counts = courseCounts[course.id] || { students: 0, materials: 0 };
                  const isDraft = course.status !== "active";

                  return (
                    <div
                      key={course.id}
                      className="group relative rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs hover:-translate-y-1 hover:shadow-md hover:border-indigo-300/80 transition-all duration-200 flex flex-col justify-between overflow-hidden"
                    >
                      {/* Subtle hover gradient indicator on top border */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-indigo-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                      <div>
                        {/* Tags Header */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100/70 truncate max-w-[140px]">
                            {course.subject || "General"}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                              isDraft
                                ? "bg-amber-50 text-amber-700 border-amber-200/70"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200/70"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isDraft ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                            />
                            {course.status}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 text-base tracking-tight">
                          <Link href={`/teacher/courses/${course.id}`} className="focus:outline-none">
                            {course.title}
                          </Link>
                        </h3>

                        {/* Description */}
                        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed min-h-[32px]">
                          {course.description || "No description provided."}
                        </p>

                        {/* Counts Pill Row */}
                        <div className="mt-4 flex items-center gap-3 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                            <Users className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                            <strong className="font-semibold text-slate-700">{counts.students}</strong>
                            <span className="text-slate-400">students</span>
                          </span>

                          <span className="inline-flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                            <FileText className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                            <strong className="font-semibold text-slate-700">{counts.materials}</strong>
                            <span className="text-slate-400">docs</span>
                          </span>
                        </div>
                      </div>

                      {/* Footer Link */}
                      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" aria-hidden="true" />
                          <span>{course.updatedAt ? "Updated recently" : "New"}</span>
                        </span>

                        <Link
                          href={`/teacher/courses/${course.id}`}
                          className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          <span>Open Workspace</span>
                          <ArrowRight
                            className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform"
                            aria-hidden="true"
                          />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Right Column: Quick Actions, Recent Materials & AI Panel (1 col) */}
          <aside aria-label="Workspace tools and recent activity" className="space-y-6">
            {/* Quick Actions Panel */}
            <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3.5 flex items-center gap-2">
                <FolderGit2 className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                <span>Quick Actions</span>
              </h2>

              <div className="space-y-2">
                <Link
                  href="/teacher/courses/new"
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100/80 hover:border-slate-200 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                        Create Course
                      </p>
                      <p className="text-[11px] text-slate-400">Initialize a new subject workspace</p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                </Link>

                <Link
                  href="/teacher/courses"
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100/80 hover:border-slate-200 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                        Browse Workspaces
                      </p>
                      <p className="text-[11px] text-slate-400">Filter, edit, and audit courses</p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                </Link>
              </div>
            </div>

            {/* Recent Materials */}
            <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <span>Recent Materials</span>
                </h2>
                {recentMaterials.length > 0 && (
                  <span className="text-[11px] font-medium text-slate-400">
                    Latest {recentMaterials.length}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <div className="w-9 h-9 rounded-lg bg-slate-200 animate-pulse shrink-0" />
                      <div className="flex-1 space-y-1">
                        <div className="w-3/4 h-3.5 bg-slate-200 rounded animate-pulse" />
                        <div className="w-1/2 h-3 bg-slate-100 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentMaterials.length === 0 ? (
                <div className="py-6 text-center">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-xs font-medium text-slate-700">No materials uploaded yet</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] mx-auto">
                    Upload syllabus or PDF textbooks inside your course workspace to train Agnes AI.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentMaterials.map((mat) => {
                    const courseTitle = coursesMap[mat.courseId]?.title;
                    const sizeMb = (mat.fileSize / (1024 * 1024)).toFixed(1);

                    return (
                      <div
                        key={mat.id}
                        className="py-3 first:pt-0 last:pb-0 flex items-start gap-3 group hover:bg-slate-50/70 p-2 rounded-xl transition-colors"
                      >
                        {/* File Type Icon */}
                        <div className="w-9 h-9 rounded-xl bg-indigo-50/80 border border-indigo-100/70 flex items-center justify-center shrink-0 mt-0.5 text-indigo-600">
                          {getFileIcon(mat.type, mat.fileName)}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate tracking-tight">
                            {mat.title}
                          </p>

                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 truncate">
                            <span className="truncate">{mat.fileName}</span>
                            <span>·</span>
                            <span>{sizeMb} MB</span>
                          </div>

                          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                            <MaterialStatusBadge status={mat.status} />

                            {courseTitle && (
                              <Link
                                href={`/teacher/courses/${mat.courseId}`}
                                className="text-[10px] font-medium text-slate-500 hover:text-indigo-600 bg-slate-100/80 hover:bg-indigo-50 px-2 py-0.5 rounded transition-colors truncate max-w-[130px]"
                                title={courseTitle}
                              >
                                {courseTitle}
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* AI Foundation Insight Panel */}
            <div className="rounded-2xl bg-linear-to-br from-indigo-950 via-slate-900 to-indigo-900 p-5 text-white shadow-xs relative overflow-hidden border border-indigo-800/40">
              <div
                className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"
                aria-hidden="true"
              />

              <div className="relative z-10">
                <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs tracking-wider uppercase mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
                  <span>EduPilot AI Foundation</span>
                </div>

                <h3 className="text-sm font-bold text-white tracking-tight">
                  Agnes 3.0 Flash &amp; Source Trust
                </h3>

                <p className="text-xs text-indigo-200/80 mt-1.5 leading-relaxed">
                  Materials are automatically indexed with chunk provenance, concept mapping, and
                  automated conflict resolution for trusted AI co-pilot responses.
                </p>

                <div className="mt-4 pt-3 border-t border-indigo-800/60 flex items-center justify-between text-xs text-indigo-300">
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Phase 1–8 Verified</span>
                  </span>

                  <Link
                    href="/teacher/courses"
                    className="font-semibold text-white hover:text-indigo-200 inline-flex items-center gap-1 transition-colors text-[11px]"
                  >
                    <span>Manage Hub</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

/**
 * Returns a tailored Lucide icon based on material type or file extension
 */
function getFileIcon(type?: string, fileName?: string) {
  const lowerName = (fileName || "").toLowerCase();
  if (type === "pdf" || lowerName.endsWith(".pdf")) {
    return <FileText className="w-4 h-4 text-rose-600" aria-hidden="true" />;
  }
  if (
    type === "ppt" ||
    lowerName.endsWith(".ppt") ||
    lowerName.endsWith(".pptx")
  ) {
    return <FileSpreadsheet className="w-4 h-4 text-amber-600" aria-hidden="true" />;
  }
  if (
    lowerName.endsWith(".doc") ||
    lowerName.endsWith(".docx") ||
    type === "document"
  ) {
    return <FileCode className="w-4 h-4 text-blue-600" aria-hidden="true" />;
  }
  return <File className="w-4 h-4 text-indigo-600" aria-hidden="true" />;
}

/**
 * Visual badge for real MaterialStatus values
 */
function MaterialStatusBadge({ status }: { status: MaterialStatus }) {
  switch (status) {
    case "ready":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/70">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Ready
        </span>
      );
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/70">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Processing
        </span>
      );
    case "uploaded":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/70">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          Uploaded
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200/70">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Failed
        </span>
      );
    case "archived":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          Archived
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
          {status}
        </span>
      );
  }
}