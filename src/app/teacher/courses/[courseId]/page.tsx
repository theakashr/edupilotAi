"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { courseService } from "@/services/courses/courseService";
import { materialService } from "@/services/materials/materialService";
import { communicationService } from "@/services/communication/communicationService";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { CourseWorkspaceNav } from "@/components/teacher/CourseWorkspaceNav";
import { EditCourseModal } from "@/components/teacher/EditCourseModal";
import type { Course, Material, Announcement } from "@/types";
import {
  Users,
  FileText,
  Megaphone,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Calendar,
  Globe,
  Clock,
  Sparkles,
} from "lucide-react";

interface PageProps {
  params: Promise<{ courseId: string }>;
}

export default function CourseWorkspacePage({ params }: PageProps) {
  const { courseId } = use(params);
  const { user } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [studentCount, setStudentCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccessDenied, setIsAccessDenied] = useState(false);

  // Edit Course Modal state
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    async function fetchWorkspaceData() {
      if (!courseId || !user?.uid) return;

      try {
        setLoading(true);
        setError(null);
        setIsAccessDenied(false);

        // 1. Fetch Course details
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

        // Section 13: Strict Course Ownership Enforcement
        if (courseData.teacherId !== user.uid) {
          setIsAccessDenied(true);
          setLoading(false);
          return;
        }

        setCourse(courseData);

        // 2. Fetch Members count, Materials, and Announcements in parallel
        const [membersRes, materialsRes, announcementsRes] = await Promise.all([
          courseService.listCourseMembers(courseId),
          materialService.listCourseMaterials(courseId),
          communicationService.listCourseAnnouncements(courseId, false),
        ]);

        if (membersRes.success) {
          setStudentCount(membersRes.data.length);
        }
        if (materialsRes.success) {
          setMaterials(materialsRes.data);
        }
        if (announcementsRes.success) {
          setAnnouncements(announcementsRes.data);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load workspace data");
      } finally {
        setLoading(false);
      }
    }

    fetchWorkspaceData();
  }, [courseId, user?.uid]);

  // Unauthorized Access State (Section 13)
  if (isAccessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <TeacherNav />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md w-full text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Access Denied</h1>
            <p className="text-sm text-gray-500 mt-2">
              You do not have permission to view or manage this course. Teachers can only access courses they created.
            </p>
            <div className="mt-6">
              <Link
                href="/teacher/courses"
                className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors"
              >
                Return to Your Courses
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <TeacherNav />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">Loading course workspace...</p>
          </div>
        </main>
      </div>
    );
  }

  // Error State
  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <TeacherNav />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md text-center">
            <p className="text-red-600 font-semibold mb-2">Error</p>
            <p className="text-sm text-gray-600 mb-4">{error || "Course could not be loaded."}</p>
            <Link
              href="/teacher/courses"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Back to Courses
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TeacherNav courseId={course.id} courseTitle={course.title} />

      <CourseWorkspaceNav
        course={course}
        onEditClick={() => setIsEditOpen(true)}
      />

      <main id="main-content" className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 w-full">
        {/* Metric Summary Cards */}
        <section aria-label="Course summary metrics" className="mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Students */}
            <Link
              href={`/teacher/courses/${course.id}/students`}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs hover:border-blue-300 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enrolled Students
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">
                    {studentCount}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
            </Link>

            {/* Materials */}
            <Link
              href={`/teacher/courses/${course.id}/materials`}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs hover:border-blue-300 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Learning Materials
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">
                    {materials.length}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
            </Link>

            {/* Announcements */}
            <Link
              href={`/teacher/courses/${course.id}/announcements`}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs hover:border-blue-300 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Announcements
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">
                    {announcements.length}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </section>

        {/* Two-Column Overview Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info Column (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Description Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
              <h2 className="text-base font-bold text-gray-900 mb-3">About this Course</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {course.description}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <span>Language: <strong className="text-gray-700 capitalize">{course.language}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>Status: <strong className="text-gray-700 capitalize">{course.status}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>Created: <strong className="text-gray-700">Active</strong></span>
                </div>
              </div>
            </div>

            {/* Recent Materials Preview */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900">Recent Materials</h2>
                <Link
                  href={`/teacher/courses/${course.id}/materials`}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  Manage all ({materials.length}) <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {materials.length === 0 ? (
                <div className="p-8 border border-dashed border-gray-200 rounded-xl text-center">
                  <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 font-medium">No materials uploaded yet</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Upload your first textbook, PDF, or slides in the Materials section.
                  </p>
                  <Link
                    href={`/teacher/courses/${course.id}/materials`}
                    className="inline-block mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Go to Materials →
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {materials.slice(0, 3).map((mat) => (
                    <div key={mat.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {mat.title}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {mat.fileName} · {(mat.fileSize / (1024 * 1024)).toFixed(1)} MB
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded capitalize shrink-0">
                        {mat.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar (1 col) */}
          <div className="space-y-6">
            {/* Quick Actions Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
                Workspace Actions
              </h2>

              <Link
                href={`/teacher/courses/${course.id}/materials`}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-sm font-medium text-gray-800"
              >
                <span>Upload Educational Material</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>

              <Link
                href={`/teacher/courses/${course.id}/announcements`}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-sm font-medium text-gray-800"
              >
                <span>Post Announcement</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>

              <Link
                href={`/teacher/courses/${course.id}/students`}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-sm font-medium text-gray-800"
              >
                <span>View Enrolled Students</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>
            </div>

            {/* Architecture Banner */}
            <div className="rounded-2xl bg-linear-to-br from-indigo-50 to-blue-50 border border-blue-100 p-6">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm mb-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>EduPilot Architecture</span>
              </div>
              <p className="text-xs text-indigo-800 leading-relaxed">
                Course metadata & memberships are preserved in <strong>Cloud Firestore</strong>, while document binaries are securely hosted in <strong>Supabase Storage</strong> under the private <code className="font-mono bg-white/60 px-1 py-0.5 rounded">edupilot-materials</code> bucket.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Course Modal */}
      {isEditOpen && (
        <EditCourseModal
          course={course}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onCourseUpdated={(updated) => setCourse(updated)}
        />
      )}
    </div>
  );
}