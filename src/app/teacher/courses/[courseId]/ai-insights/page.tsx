"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { courseService } from "@/services/courses/courseService";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { CourseWorkspaceNav } from "@/components/teacher/CourseWorkspaceNav";
import { TeacherAdaptiveInsights } from "@/components/teacher/adaptive/TeacherAdaptiveInsights";
import type { Course } from "@/types";
import { ShieldAlert, Sparkles } from "lucide-react";

interface PageProps {
  params: Promise<{ courseId: string }>;
}

export default function CourseAdaptiveInsightsPage({ params }: PageProps) {
  const { courseId } = use(params);
  const { user } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccessDenied, setIsAccessDenied] = useState(false);

  useEffect(() => {
    async function loadCourse() {
      if (!courseId || !user?.uid) return;

      try {
        setLoading(true);
        setError(null);
        setIsAccessDenied(false);

        const courseRes = await courseService.getCourseById(courseId);
        if (!courseRes.success) {
          setError(courseRes.error || "Course not found.");
          return;
        }

        if (!courseRes.data) {
          setError("Course not found.");
          return;
        }

        const c = courseRes.data;
        if (c.teacherId !== user.uid) {
          setIsAccessDenied(true);
          return;
        }

        setCourse(c);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load course.");
      } finally {
        setLoading(false);
      }
    }

    loadCourse();
  }, [courseId, user?.uid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <TeacherNav />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-pulse">
          <div className="h-10 w-64 bg-slate-200 rounded-2xl" />
          <div className="h-64 bg-white rounded-3xl border border-slate-200" />
        </main>
      </div>
    );
  }

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
                ? "You do not have permission to view adaptive learning insights for this course. Only the authorized teacher can inspect private student performance."
                : error || "Failed to load course."}
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TeacherNav />

      {course && <CourseWorkspaceNav course={course} />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Workspace Subheader */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                Adaptive Learning Engine
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight mt-1.5">
              AI Insights &amp; Learning Gaps
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Evidence-based mastery estimates, prerequisite bottleneck identification, and targeted interventions.
            </p>
          </div>
        </div>

        {/* Adaptive Insights Content */}
        <TeacherAdaptiveInsights courseId={courseId} />
      </main>
    </div>
  );
}
