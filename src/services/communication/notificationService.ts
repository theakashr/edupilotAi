import {
  doc,
  setDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { typedDoc, notificationCollection } from '@/lib/firebase/converters';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { nowTimestamp } from '@/lib/firebase/timestamps';
import type { Notification, NotificationType, DbResult } from '@/types';

export interface CreateNotificationInput {
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId?: string;
}

export const notificationService = {
  /**
   * Create a single notification.
   */
  async createNotification(
    input: CreateNotificationInput
  ): Promise<DbResult<Notification>> {
    try {
      const colRef = notificationCollection();
      const newDocRef = doc(colRef);
      const now = nowTimestamp();

      const notification: Notification = {
        id: newDocRef.id,
        recipientId: input.recipientId,
        type: input.type,
        title: input.title,
        message: input.message,
        referenceId: input.referenceId,
        isRead: false,
        createdAt: now,
      };

      await setDoc(newDocRef, notification);
      return { success: true, data: notification };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create notification',
      };
    }
  },

  /**
   * Create bulk notifications in a batch (e.g. for all students in a course).
   */
  async createBulkNotifications(
    inputs: CreateNotificationInput[]
  ): Promise<DbResult<void>> {
    if (inputs.length === 0) return { success: true, data: undefined };

    try {
      const batch = writeBatch(db);
      const colRef = notificationCollection();
      const now = nowTimestamp();

      for (const input of inputs) {
        const newDocRef = doc(colRef);
        batch.set(newDocRef, {
          id: newDocRef.id,
          recipientId: input.recipientId,
          type: input.type,
          title: input.title,
          message: input.message,
          referenceId: input.referenceId,
          isRead: false,
          createdAt: now,
        });
      }

      await batch.commit();
      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create bulk notifications',
      };
    }
  },

  /**
   * Get unread notifications for a user.
   */
  async getUnreadNotifications(
    userId: string
  ): Promise<DbResult<Notification[]>> {
    try {
      const q = query(
        notificationCollection(),
        where('recipientId', '==', userId),
        where('isRead', '==', false),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const notifications = snapshot.docs.map((d) => d.data());
      return { success: true, data: notifications };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to get unread notifications',
      };
    }
  },

  /**
   * Get all notifications for a user.
   */
  async getAllNotifications(
    userId: string
  ): Promise<DbResult<Notification[]>> {
    try {
      const q = query(
        notificationCollection(),
        where('recipientId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const notifications = snapshot.docs.map((d) => d.data());
      return { success: true, data: notifications };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to get notifications',
      };
    }
  },

  /**
   * Mark a notification as read.
   */
  async markAsRead(
    notificationId: string
  ): Promise<DbResult<void>> {
    try {
      const docRef = typedDoc<Notification>(COLLECTIONS.NOTIFICATIONS, notificationId);
      await updateDoc(docRef, { isRead: true });
      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to mark notification as read',
      };
    }
  },

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(
    userId: string
  ): Promise<DbResult<void>> {
    try {
      const q = query(
        notificationCollection(),
        where('recipientId', '==', userId),
        where('isRead', '==', false)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return { success: true, data: undefined };

      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.update(d.ref, { isRead: true });
      });

      await batch.commit();
      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to mark all as read',
      };
    }
  }
};
