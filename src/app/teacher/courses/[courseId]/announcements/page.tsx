"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { courseService } from "@/services/courses/courseService";
import { communicationService } from "@/services/communication/communicationService";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { CourseWorkspaceNav } from "@/components/teacher/CourseWorkspaceNav";
import { CreateAnnouncementModal } from "@/components/teacher/CreateAnnouncementModal";
import type { Course, Announcement } from "@/types";
import {
  Megaphone,
  Plus,
  ShieldAlert,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Clock,
} from "lucide-react";

interface PageProps {
  params: Promise<{ courseId: string }>;
}

export default function CourseAnnouncementsPage({ params }: PageProps) {
  const { courseId } = use(params);
  const { user } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccessDenied, setIsAccessDenied] = useState(false);

  // Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!courseId || !user?.uid) return;

      try {
        setLoading(true);
        setError(null);

        // 1. Fetch Course details & verify ownership
        const courseRes = await courseService.getCourseById(courseId);
        if (!courseRes.success) {
          setError(courseRes.error);
          setLoading(false);
          return;
        }

        if (!courseRes.data) {
          setError("Course not found");
          setLoading(false);
          return;
        }

        if (courseRes.data.teacherId !== user.uid) {
          setIsAccessDenied(true);
          setLoading(false);
          return;
        }

        setCourse(courseRes.data);

        // 2. Fetch all announcements (published + unpublished)
        const annRes = await communicationService.listCourseAnnouncements(courseId, false);
        if (!annRes.success) {
          setError(annRes.error);
          setLoading(false);
          return;
        }

        setAnnouncements(annRes.data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load announcements");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [courseId, user?.uid]);

  // Toggle Publish/Unpublish status
  const handleTogglePublish = async (ann: Announcement) => {
    try {
      const newStatus = !ann.isPublished;
      const res = await communicationService.updateAnnouncement(ann.id, {
        isPublished: newStatus,
      });

      if (res.success) {
        setAnnouncements((prev) =>
          prev.map((item) =>
            item.id === ann.id ? { ...item, isPublished: newStatus } : item
          )
        );
      } else {
        alert(`Failed to update announcement status: ${res.error}`);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Update failed");
    }
  };

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
              You do not have permission to manage announcements for this course.
            </p>
            <div className="mt-6">
              <Link
                href="/teacher/courses"
                className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700"
              >
                Back to Courses
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (loading || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <TeacherNav />
        <main className="flex-1 flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TeacherNav courseId={course.id} courseTitle={course.title} />

      <CourseWorkspaceNav course={course} />

      <main id="main-content" className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Course Announcements ({announcements.length})
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Broadcast updates, schedule changes, and deadlines to your students.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Announcement</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm flex items-start gap-3 border border-red-200">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Announcements List */}
        {announcements.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
            <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900">
              No announcements yet.
            </h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              Share important course updates, lecture reminders, and guidance with your students.
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Announcement</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs hover:border-gray-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                        ann.isPublished
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-gray-100 text-gray-600 border border-gray-200"
                      }`}
                    >
                      {ann.isPublished ? "Published" : "Draft (Unpublished)"}
                    </span>
                    <span className="text-xs text-gray-400 capitalize">
                      Target: {ann.target}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(ann)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      {ann.isPublished ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Unpublish</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          <span>Publish Now</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-gray-900 mb-2">
                  {ann.title}
                </h3>

                <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                  {ann.message}
                </p>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Posted recently</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Announcement Modal */}
      {isCreateOpen && (
        <CreateAnnouncementModal
          courseId={course.id}
          teacherId={user!.uid}
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onAnnouncementCreated={(newAnn) => {
            setAnnouncements((prev) => [newAnn, ...prev]);
          }}
        />
      )}
    </div>
  );
}
