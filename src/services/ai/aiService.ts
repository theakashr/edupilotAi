import {
  getDoc,
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
  aiRecommendationCollection,
  aiDecisionEventCollection,
  typedDoc,
} from '@/lib/firebase/converters';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { nowTimestamp } from '@/lib/firebase/timestamps';
import type {
  AIRecommendation,
  AIDecisionEvent,
  RecommendationStatus,
  DbResult,
} from '@/types';
import type {
  CreateAIRecommendationInput,
  CreateAIDecisionEventInput,
} from '@/lib/validation';

/**
 * Service managing AI recommendations (human-in-the-loop) and decision audit events.
 */
export const aiService = {
  // ─── Recommendations ───────────────────────────────────────────────────────

  /**
   * Record a new AI recommendation.
   * Status defaults to 'pending' awaiting teacher review.
   */
  async createRecommendation(
    input: CreateAIRecommendationInput
  ): Promise<DbResult<AIRecommendation>> {
    try {
      const colRef = aiRecommendationCollection();
      const newDocRef = doc(colRef);
      const now = nowTimestamp();

      const newRec: AIRecommendation = {
        id: newDocRef.id,
        courseId: input.courseId,
        studentId: input.studentId,
        type: input.type,
        title: input.title,
        explanation: input.explanation,
        priority: input.priority,
        status: input.status,
        createdBy: 'ai',
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(newDocRef, newRec);
      return { success: true, data: newRec };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create recommendation',
      };
    }
  },

  /**
   * Get recommendation by ID.
   */
  async getRecommendationById(
    recommendationId: string
  ): Promise<DbResult<AIRecommendation | null>> {
    try {
      const docRef = typedDoc<AIRecommendation>(
        COLLECTIONS.AI_RECOMMENDATIONS,
        recommendationId
      );
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return { success: true, data: null };
      }

      return { success: true, data: snapshot.data() };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve recommendation',
      };
    }
  },

  /**
   * List recommendations for a course.
   */
  async listCourseRecommendations(
    courseId: string,
    statusFilter?: RecommendationStatus
  ): Promise<DbResult<AIRecommendation[]>> {
    try {
      let q = query(
        aiRecommendationCollection(),
        where('courseId', '==', courseId),
        orderBy('createdAt', 'desc')
      );

      if (statusFilter) {
        q = query(
          aiRecommendationCollection(),
          where('courseId', '==', courseId),
          where('status', '==', statusFilter),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      const recs = snapshot.docs.map((d) => d.data());
      return { success: true, data: recs };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list course recommendations',
      };
    }
  },

  /**
   * List recommendations targeting a specific student.
   */
  async listStudentRecommendations(
    studentId: string,
    courseId: string
  ): Promise<DbResult<AIRecommendation[]>> {
    try {
      const q = query(
        aiRecommendationCollection(),
        where('studentId', '==', studentId),
        where('courseId', '==', courseId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const recs = snapshot.docs.map((d) => d.data());
      return { success: true, data: recs };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list student recommendations',
      };
    }
  },

  /**
   * Teacher reviews a recommendation (approves or rejects).
   */
  async reviewRecommendation(
    recommendationId: string,
    teacherId: string,
    newStatus: 'approved' | 'rejected' | 'executed'
  ): Promise<DbResult<void>> {
    try {
      const docRef = typedDoc<AIRecommendation>(
        COLLECTIONS.AI_RECOMMENDATIONS,
        recommendationId
      );
      await updateDoc(docRef, {
        status: newStatus,
        reviewedBy: teacherId,
        reviewedAt: nowTimestamp(),
        updatedAt: nowTimestamp(),
      });
      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to review recommendation',
      };
    }
  },

  // ─── Decision Events (Audit Trail) ─────────────────────────────────────────

  /**
   * Log an immutable AI decision event for auditability and explainability.
   */
  async logDecisionEvent(
    input: CreateAIDecisionEventInput
  ): Promise<DbResult<AIDecisionEvent>> {
    try {
      const colRef = aiDecisionEventCollection();
      const newDocRef = doc(colRef);

      const event: AIDecisionEvent = {
        id: newDocRef.id,
        courseId: input.courseId,
        studentId: input.studentId,
        eventType: input.eventType,
        summary: input.summary,
        reasoning: input.reasoning,
        createdAt: nowTimestamp(),
      };

      await setDoc(newDocRef, event);
      return { success: true, data: event };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to log decision event',
      };
    }
  },

  /**
   * List recent decision events for a course.
   */
  async listCourseDecisionEvents(
    courseId: string,
    maxCount = 50
  ): Promise<DbResult<AIDecisionEvent[]>> {
    try {
      const q = query(
        aiDecisionEventCollection(),
        where('courseId', '==', courseId),
        orderBy('createdAt', 'desc'),
        limit(maxCount)
      );
      const snapshot = await getDocs(q);
      const events = snapshot.docs.map((d) => d.data());
      return { success: true, data: events };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list decision events',
      };
    }
  },
};
