"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { createCourseSchema } from "@/lib/validation";
import { courseService } from "@/services/courses/courseService";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import type { CourseStatus } from "@/types";
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export default function CreateCoursePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("en");
  const [status, setStatus] = useState<CourseStatus>("active");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) {
      setError("You must be authenticated to create a course.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Validate with Phase 3 schema
      // Automatically enforces teacherId = authenticated user UID
      const input = createCourseSchema.parse({
        title: title.trim(),
        subject: subject.trim(),
        description: description.trim(),
        language: language.trim() || "en",
        status,
        teacherId: user.uid,
      });

      const res = await courseService.createCourse(input);

      if (!res.success) {
        setError(res.error);
        setLoading(false);
        return;
      }

      // Redirect immediately to the new course workspace
      router.push(`/teacher/courses/${res.data.id}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create course. Please review the form fields.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col font-sans selection:bg-indigo-500/20 selection:text-indigo-900">
      <TeacherNav />

      <main id="main-content" className="flex-1 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Breadcrumb / Back link */}
        <div className="mb-6">
          <Link
            href="/teacher/courses"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Courses</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Create New Course
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Set up a course workspace for educational materials, quizzes, and student learning.
              </p>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-xl bg-rose-50 text-rose-700 text-sm flex items-start gap-2.5 border border-rose-200"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label htmlFor="course-title" className="block text-sm font-semibold text-slate-800 mb-1">
                Course Title *
              </label>
              <input
                id="course-title"
                type="text"
                required
                minLength={3}
                maxLength={120}
                placeholder="e.g. CS 101: Introduction to Computer Systems & Architecture"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-400"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Between 3 and 120 characters.
              </p>
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="course-subject" className="block text-sm font-semibold text-slate-800 mb-1">
                Subject / Discipline *
              </label>
              <input
                id="course-subject"
                type="text"
                required
                minLength={2}
                maxLength={60}
                placeholder="e.g. Computer Science, Mathematics, Physics"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="course-description" className="block text-sm font-semibold text-slate-800 mb-1">
                Description *
              </label>
              <textarea
                id="course-description"
                required
                rows={4}
                minLength={10}
                maxLength={2000}
                placeholder="Provide a comprehensive summary of course goals, prerequisite knowledge, and topics covered..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none resize-none leading-relaxed transition-all placeholder:text-slate-400"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Minimum 10 characters.
              </p>
            </div>

            {/* Language & Initial Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label htmlFor="course-status" className="block text-sm font-semibold text-slate-800 mb-1">
                  Initial Status
                </label>
                <select
                  id="course-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CourseStatus)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none capitalize bg-white cursor-pointer"
                >
                  <option value="draft">Draft (Private to you)</option>
                  <option value="active">Active (Ready for students)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Draft courses are only visible to you until activated.
                </p>
              </div>

              <div>
                <label htmlFor="course-language" className="block text-sm font-semibold text-slate-800 mb-1">
                  Instruction Language
                </label>
                <input
                  id="course-language"
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="en"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  e.g. &apos;en&apos; for English.
                </p>
              </div>
            </div>

            {/* Teacher ID (read-only verification) */}
            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Assigned Teacher:</span>
              <span className="font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                {user?.uid || "Authenticated User"}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
              <Link
                href="/teacher/courses"
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Course...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Create Course Workspace</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
