"use client";

import { useState } from "react";
import { communicationService } from "@/services/communication/communicationService";
import type { Announcement, AnnouncementTarget } from "@/types";
import { X, Loader2, AlertCircle, Megaphone } from "lucide-react";

interface CreateAnnouncementModalProps {
  courseId: string;
  teacherId: string;
  isOpen: boolean;
  onClose: () => void;
  onAnnouncementCreated: (announcement: Announcement) => void;
}

export function CreateAnnouncementModal({
  courseId,
  teacherId,
  isOpen,
  onClose,
  onAnnouncementCreated,
}: CreateAnnouncementModalProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<AnnouncementTarget>("course");
  const [isPublished, setIsPublished] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError("Title and announcement message are required.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await communicationService.createAnnouncement({
        courseId,
        teacherId,
        title: title.trim(),
        message: message.trim(),
        target,
        isPublished,
      });

      if (!res.success) {
        setError(res.error);
        setLoading(false);
        return;
      }

      onAnnouncementCreated(res.data);
      setTitle("");
      setMessage("");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create announcement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-announcement-modal-title"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-blue-600" />
            <h2 id="create-announcement-modal-title" className="text-lg font-semibold text-gray-900">
              New Course Announcement
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1 transition-colors"
            aria-label="Close dialog"
            disabled={loading}
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
            <label htmlFor="announcement-title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              id="announcement-title"
              type="text"
              required
              minLength={3}
              maxLength={150}
              placeholder="e.g. Schedule Update for Lab Exam"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="announcement-message" className="block text-sm font-medium text-gray-700 mb-1">
              Announcement Message *
            </label>
            <textarea
              id="announcement-message"
              required
              rows={4}
              minLength={5}
              maxLength={3000}
              placeholder="Write your announcement message for students..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="announcement-target" className="block text-sm font-medium text-gray-700 mb-1">
                Target Audience
              </label>
              <select
                id="announcement-target"
                value={target}
                onChange={(e) => setTarget(e.target.value as AnnouncementTarget)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="course">Entire Course</option>
                <option value="students">Enrolled Students Only</option>
              </select>
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">Publish immediately</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
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
              <span>Post Announcement</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
