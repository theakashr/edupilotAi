import {
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  doc,
} from 'firebase/firestore';
import {
  announcementCollection,
  teacherMessageCollection,
  studentMessageCollection,
  notificationCollection,
  typedDoc,
} from '@/lib/firebase/converters';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { nowTimestamp } from '@/lib/firebase/timestamps';
import type {
  Announcement,
  TeacherMessage,
  StudentMessage,
  Notification,
  DbResult,
} from '@/types';
import type {
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
  CreateNotificationInput,
} from '@/lib/validation';

/**
 * Service managing announcements, teacher-student communication, and notifications.
 */
export const communicationService = {
  // ─── Announcements ──────────────────────────────────────────────────────────

  /**
   * Create a course announcement.
   */
  async createAnnouncement(
    input: CreateAnnouncementInput
  ): Promise<DbResult<Announcement>> {
    try {
      const colRef = announcementCollection();
      const newDocRef = doc(colRef);
      const now = nowTimestamp();

      const newAnnouncement: Announcement = {
        id: newDocRef.id,
        courseId: input.courseId,
        teacherId: input.teacherId,
        title: input.title,
        message: input.message,
        target: input.target,
        isPublished: input.isPublished,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(newDocRef, newAnnouncement);
      return { success: true, data: newAnnouncement };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create announcement',
      };
    }
  },

  /**
   * List announcements for a course.
   */
  async listCourseAnnouncements(
    courseId: string,
    onlyPublished = true
  ): Promise<DbResult<Announcement[]>> {
    try {
      try {
        let q = query(
          announcementCollection(),
          where('courseId', '==', courseId),
          orderBy('createdAt', 'desc')
        );

        if (onlyPublished) {
          q = query(
            announcementCollection(),
            where('courseId', '==', courseId),
            where('isPublished', '==', true),
            orderBy('createdAt', 'desc')
          );
        }

        const snapshot = await getDocs(q);
        const announcements = snapshot.docs.map((d) => d.data());
        return { success: true, data: announcements };
      } catch (queryErr: unknown) {
        const errMsg = queryErr instanceof Error ? queryErr.message : '';
        if (errMsg.includes('requires an index') || errMsg.includes('failed-precondition')) {
          let fallbackQ = query(
            announcementCollection(),
            where('courseId', '==', courseId)
          );
          if (onlyPublished) {
            fallbackQ = query(
              announcementCollection(),
              where('courseId', '==', courseId),
              where('isPublished', '==', true)
            );
          }
          const snapshot = await getDocs(fallbackQ);
          const announcements = snapshot.docs
            .map((d) => d.data())
            .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
          return { success: true, data: announcements };
        }
        throw queryErr;
      }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list announcements',
      };
    }
  },

  /**
   * Update an announcement.
   */
  async updateAnnouncement(
    announcementId: string,
    updates: UpdateAnnouncementInput
  ): Promise<DbResult<void>> {
    try {
      const docRef = typedDoc<Announcement>(
        COLLECTIONS.ANNOUNCEMENTS,
        announcementId
      );
      await updateDoc(docRef, {
        ...updates,
        updatedAt: nowTimestamp(),
      });
      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update announcement',
      };
    }
  },

  // ─── Direct Messages ────────────────────────────────────────────────────────

  /**
   * Send a direct message from teacher to student.
   */
  async sendTeacherMessage(
    teacherId: string,
    studentId: string,
    courseId: string,
    message: string
  ): Promise<DbResult<TeacherMessage>> {
    try {
      const colRef = teacherMessageCollection();
      const newDocRef = doc(colRef);
      const now = nowTimestamp();

      const newMsg: TeacherMessage = {
        id: newDocRef.id,
        teacherId,
        studentId,
        courseId,
        message,
        createdAt: now,
      };

      await setDoc(newDocRef, newMsg);
      return { success: true, data: newMsg };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to send message',
      };
    }
  },

  /**
   * Send a direct message from student to teacher.
   */
  async sendStudentMessage(
    studentId: string,
    teacherId: string,
    courseId: string,
    message: string
  ): Promise<DbResult<StudentMessage>> {
    try {
      const colRef = studentMessageCollection();
      const newDocRef = doc(colRef);
      const now = nowTimestamp();

      const newMsg: StudentMessage = {
        id: newDocRef.id,
        studentId,
        teacherId,
        courseId,
        message,
        createdAt: now,
      };

      await setDoc(newDocRef, newMsg);
      return { success: true, data: newMsg };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to send message',
      };
    }
  },

  /**
   * List messages exchanged between a teacher and a student for a course.
   */
  async listConversation(
    courseId: string,
    teacherId: string,
    studentId: string
  ): Promise<DbResult<{ teacherMessages: TeacherMessage[]; studentMessages: StudentMessage[] }>> {
    try {
      const tQuery = query(
        teacherMessageCollection(),
        where('courseId', '==', courseId),
        where('teacherId', '==', teacherId),
        where('studentId', '==', studentId),
        orderBy('createdAt', 'asc')
      );
      const sQuery = query(
        studentMessageCollection(),
        where('courseId', '==', courseId),
        where('teacherId', '==', teacherId),
        where('studentId', '==', studentId),
        orderBy('createdAt', 'asc')
      );

      const [tSnap, sSnap] = await Promise.all([getDocs(tQuery), getDocs(sQuery)]);

      return {
        success: true,
        data: {
          teacherMessages: tSnap.docs.map((d) => d.data()),
          studentMessages: sSnap.docs.map((d) => d.data()),
        },
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list conversation',
      };
    }
  },

  // ─── Notifications ──────────────────────────────────────────────────────────

  /**
   * Create a notification for a user.
   */
  async createNotification(
    input: CreateNotificationInput
  ): Promise<DbResult<Notification>> {
    try {
      const colRef = notificationCollection();
      const newDocRef = doc(colRef);

      const notif: Notification = {
        id: newDocRef.id,
        recipientId: input.recipientId,
        type: input.type,
        title: input.title,
        message: input.message,
        referenceId: input.referenceId,
        isRead: input.isRead,
        createdAt: nowTimestamp(),
      };

      await setDoc(newDocRef, notif);
      return { success: true, data: notif };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create notification',
      };
    }
  },

  /**
   * List notifications for a user.
   */
  async listUserNotifications(
    userId: string,
    maxCount = 30
  ): Promise<DbResult<Notification[]>> {
    try {
      const q = query(
        notificationCollection(),
        where('recipientId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(maxCount)
      );
      const snapshot = await getDocs(q);
      const notifications = snapshot.docs.map((d) => d.data());
      return { success: true, data: notifications };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list notifications',
      };
    }
  },

  /**
   * Mark a notification as read.
   */
  async markNotificationRead(notificationId: string): Promise<DbResult<void>> {
    try {
      const docRef = typedDoc<Notification>(
        COLLECTIONS.NOTIFICATIONS,
        notificationId
      );
      await updateDoc(docRef, { isRead: true });
      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update notification',
      };
    }
  },
};
