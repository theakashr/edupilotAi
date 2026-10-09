"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { courseService } from "@/services/courses/courseService";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { TeacherAdaptiveInsights } from "@/components/teacher/adaptive/TeacherAdaptiveInsights";
import type { Course } from "@/types";
import { Sparkles, BookOpen, ChevronRight } from "lucide-react";

export default function TeacherAiInsightsOverviewPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCourses() {
      if (!user?.uid) return;
      try {
        setLoading(true);
        const res = await courseService.listTeacherCourses(user.uid, 50);
        if (res.success && res.data) {
          setCourses(res.data);
          if (res.data.length > 0) {
            setSelectedCourse(res.data[0]);
          }
        }
      } catch (err) {
        console.warn("Failed to load courses:", err);
      } finally {
        setLoading(false);
      }
    }

    loadCourses();
  }, [user?.uid]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TeacherNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                Adaptive Learning Engine
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mt-1.5">
              Teacher AI Insights &amp; Adaptive Diagnostics
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Class-level concept difficulty analysis, prerequisite bottlenecks, and evidence-grounded student interventions.
            </p>
          </div>

          {/* Course Selector */}
          {courses.length > 0 && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <label htmlFor="course-select" className="text-xs font-medium text-slate-500">
                Course:
              </label>
              <div className="relative">
                <select
                  id="course-select"
                  value={selectedCourse?.id || ""}
                  onChange={(e) => {
                    const c = courses.find((item) => item.id === e.target.value);
                    if (c) setSelectedCourse(c);
                  }}
                  className="appearance-none bg-white border border-slate-200 text-slate-800 text-xs font-semibold py-2 pl-3 pr-8 rounded-xl shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
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
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-28 bg-white rounded-2xl border border-slate-200" />
            <div className="h-64 bg-white rounded-3xl border border-slate-200" />
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
            <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No Courses Available</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create a course and enroll students to start tracking adaptive learning progress and concept gaps.
            </p>
            <div className="pt-2">
              <Link
                href="/teacher/courses/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
              >
                <span>Create New Course</span>
              </Link>
            </div>
          </div>
        ) : selectedCourse ? (
          <TeacherAdaptiveInsights courseId={selectedCourse.id} />
        ) : null}
      </main>
    </div>
  );
}