"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { courseService } from "@/services/courses/courseService";
import { materialService } from "@/services/materials/materialService";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { EditCourseModal } from "@/components/teacher/EditCourseModal";
import type { Course } from "@/types";
import {
  BookOpen,
  Plus,
  Search,
  Users,
  FileText,
  ArrowRight,
  Edit3,
  Loader2,
  AlertCircle,
  Filter,
  Trash2,
} from "lucide-react";

export default function TeacherCoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseCounts, setCourseCounts] = useState<
    Record<string, { students: number; materials: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Edit Modal state
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);

  const handleDeleteCourse = async (e: React.MouseEvent, courseId: string, courseTitle: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Are you sure you want to permanently delete the course "${courseTitle}"? This cannot be undone.`)) {
      return;
    }

    setDeletingCourseId(courseId);
    try {
      const res = await courseService.deleteCourse(courseId);
      if (res.success) {
        setCourses((prev) => prev.filter((c) => c.id !== courseId));
      } else {
        alert(res.error || "Failed to delete course");
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setDeletingCourseId(null);
    }
  };

  useEffect(() => {
    async function loadCourses() {
      if (!user?.uid) return;
      try {
        setLoading(true);
        setError(null);

        const res = await courseService.listTeacherCourses(user.uid, 100);
        if (!res.success) {
          setError(res.error);
          setLoading(false);
          return;
        }

        const list = res.data;
        setCourses(list);

        // Load counts for each course
        const countsMap: Record<string, { students: number; materials: number }> = {};
        await Promise.all(
          list.map(async (c) => {
            const [mRes, matRes] = await Promise.all([
              courseService.listCourseMembers(c.id),
              materialService.listCourseMaterials(c.id),
            ]);
            countsMap[c.id] = {
              students: mRes.success ? mRes.data.length : 0,
              materials: matRes.success ? matRes.data.length : 0,
            };
          })
        );
        setCourseCounts(countsMap);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load courses");
      } finally {
        setLoading(false);
      }
    }

    loadCourses();
  }, [user?.uid]);

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ? true : c.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [courses, searchTerm, statusFilter]);

  const handleCourseUpdated = (updated: Course) => {
    setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col font-sans selection:bg-indigo-500/20 selection:text-indigo-900">
      <TeacherNav />

      <main id="main-content" className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-2 border border-indigo-100">
              Curriculum &amp; Cohorts
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Course Workspaces
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Create, organize, and monitor all courses you instruct with AI-powered co-pilots.
            </p>
          </div>

          <Link
            href="/teacher/courses/new"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 hover:bg-indigo-700 active:scale-[0.98] transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Course</span>
          </Link>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl bg-rose-50 text-rose-700 text-sm flex items-start gap-3 border border-rose-200/80 shadow-xs"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <p>{error}</p>
          </div>
        )}

        {/* Search & Filter Controls */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 mb-8 shadow-xs flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search courses by title, subject, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none placeholder:text-slate-400 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-slate-700 capitalize cursor-pointer transition-all"
            >
              <option value="all">All Statuses ({courses.length})</option>
              <option value="active">Active Only</option>
              <option value="draft">Draft Only</option>
              <option value="archived">Archived Only</option>
            </select>
          </div>
        </div>

        {/* Course Cards / List */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-xs">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">Loading your courses...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center shadow-xs">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900">
              {courses.length === 0
                ? "You haven't created any courses yet."
                : "No matching courses found."}
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {courses.length === 0
                ? "Start by creating a course workspace. You can upload educational materials and enroll students."
                : "Try adjusting your search keywords or status filter."}
            </p>
            {courses.length === 0 && (
              <div className="mt-5">
                <Link
                  href="/teacher/courses/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm shadow-indigo-600/25 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Your First Course</span>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => {
              const counts = courseCounts[course.id] || { students: 0, materials: 0 };
              const isDraft = course.status !== "active";

              return (
                <div
                  key={course.id}
                  className="group relative bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:-translate-y-1 hover:shadow-md hover:border-indigo-300/80 transition-all duration-200 flex flex-col justify-between overflow-hidden"
                >
                  {/* Subtle top indicator */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-indigo-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                  <div>
                    {/* Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3.5">
                      <span className="text-xs font-semibold text-indigo-700 bg-indigo-50/80 px-2.5 py-0.5 rounded-md border border-indigo-100/70 truncate max-w-[150px]">
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

                    <h2 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 mb-1.5 tracking-tight">
                      <Link href={`/teacher/courses/${course.id}`} className="focus:outline-none">
                        {course.title}
                      </Link>
                    </h2>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed min-h-[32px]">
                      {course.description || "No course description provided."}
                    </p>

                    {/* Stats metrics */}
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-100">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          <strong className="font-semibold text-slate-700">{counts.students}</strong>{" "}
                          Enrolled
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-100">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          <strong className="font-semibold text-slate-700">{counts.materials}</strong>{" "}
                          Docs
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingCourse(course)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Edit Course Details"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteCourse(e, course.id, course.title)}
                        disabled={deletingCourseId === course.id}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-50"
                        title="Delete Course"
                      >
                        {deletingCourseId === course.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        <span>Delete</span>
                      </button>
                    </div>

                    <Link
                      href={`/teacher/courses/${course.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 rounded-lg shadow-sm shadow-indigo-600/20 active:scale-[0.98] transition-all"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Edit Course Modal */}
      {editingCourse && (
        <EditCourseModal
          course={editingCourse}
          isOpen={true}
          onClose={() => setEditingCourse(null)}
          onCourseUpdated={handleCourseUpdated}
        />
      )}
    </div>
  );
}