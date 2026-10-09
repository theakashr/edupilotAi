"use client";

import { useState } from "react";
import { updateCourseSchema } from "@/lib/validation";
import { courseService } from "@/services/courses/courseService";
import type { Course, CourseStatus } from "@/types";
import { X, Loader2, AlertCircle } from "lucide-react";

interface EditCourseModalProps {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
  onCourseUpdated: (updated: Course) => void;
}

export function EditCourseModal({
  course,
  isOpen,
  onClose,
  onCourseUpdated,
}: EditCourseModalProps) {
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description);
  const [subject, setSubject] = useState(course.subject);
  const [language, setLanguage] = useState(course.language || "en");
  const [status, setStatus] = useState<CourseStatus>(course.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const parsed = updateCourseSchema.parse({
        title,
        description,
        subject,
        language,
        status,
      });

      const res = await courseService.updateCourse(course.id, parsed);

      if (!res.success) {
        setError(res.error);
        setLoading(false);
        return;
      }

      onCourseUpdated({
        ...course,
        ...parsed,
        title: parsed.title ?? course.title,
        description: parsed.description ?? course.description,
        subject: parsed.subject ?? course.subject,
        language: parsed.language ?? course.language,
        status: parsed.status ?? course.status,
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to update course");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-course-modal-title"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 id="edit-course-modal-title" className="text-lg font-semibold text-gray-900">
            Edit Course Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-start gap-2 border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">
              Course Title *
            </label>
            <input
              id="edit-title"
              type="text"
              required
              minLength={3}
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="edit-subject" className="block text-sm font-medium text-gray-700 mb-1">
              Subject *
            </label>
            <input
              id="edit-subject"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              id="edit-description"
              required
              rows={3}
              minLength={10}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="edit-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as CourseStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none capitalize"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label htmlFor="edit-language" className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <input
                id="edit-language"
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
