import type { Timestamp } from 'firebase/firestore';

// ─── Announcements ────────────────────────────────────────────────────────────

export type AnnouncementTarget = 'course' | 'students';

export interface Announcement {
  id: string;
  courseId: string;
  teacherId: string;
  title: string;
  message: string;
  target: AnnouncementTarget;
  isPublished: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

/** Teacher → Student direct message */
export interface TeacherMessage {
  id: string;
  teacherId: string;
  studentId: string;
  courseId: string;
  message: string;
  createdAt: Timestamp;
  readAt?: Timestamp;
}

/** Student → Teacher direct message */
export interface StudentMessage {
  id: string;
  studentId: string;
  teacherId: string;
  courseId: string;
  message: string;
  createdAt: Timestamp;
  readAt?: Timestamp;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'announcement'
  | 'assignment'
  | 'assessment'
  | 'feedback'
  | 'learning'
  | 'system';

export interface Notification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId?: string;
  isRead: boolean;
  createdAt: Timestamp;
}
