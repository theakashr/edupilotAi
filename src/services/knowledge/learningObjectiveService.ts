/**
 * src/services/knowledge/learningObjectiveService.ts
 *
 * Learning objectives service for EduPilot AI Phase 6.
 * Provides teacher-curated learning objectives linked to course concepts and materials.
 * 
 * STRICT COMPLIANCE:
 * - Teacher-created only (No AI generation in Phase 6).
 */

import {
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  doc,
} from 'firebase/firestore';
import { learningObjectiveCollection, typedDoc } from '@/lib/firebase/converters';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { nowTimestamp } from '@/lib/firebase/timestamps';
import type { LearningObjective, DbResult } from '@/types';
import type { CreateLearningObjectiveInput, UpdateLearningObjectiveInput } from '@/lib/validation';

export const learningObjectiveService = {
  /**
   * Creates a teacher-defined learning objective for a course.
   */
  async createObjective(
    input: CreateLearningObjectiveInput
  ): Promise<DbResult<LearningObjective>> {
    try {
      const colRef = learningObjectiveCollection();
      const newDocRef = doc(colRef);
      const now = nowTimestamp();

      const newObjective: LearningObjective = {
        id: newDocRef.id,
        courseId: input.courseId,
        title: input.title.trim(),
        description: input.description?.trim(),
        conceptIds: input.conceptIds || [],
        materialIds: input.materialIds || [],
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(newDocRef, newObjective);
      return { success: true, data: newObjective };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create learning objective',
      };
    }
  },

  /**
   * Lists all learning objectives for a course.
   */
  async listCourseObjectives(
    courseId: string
  ): Promise<DbResult<LearningObjective[]>> {
    try {
      const q = query(
        learningObjectiveCollection(),
        where('courseId', '==', courseId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const objectives = snapshot.docs.map((d) => d.data());
      return { success: true, data: objectives };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list learning objectives',
      };
    }
  },

  /**
   * Retrieves a single learning objective by ID.
   */
  async getObjectiveById(
    objectiveId: string
  ): Promise<DbResult<LearningObjective | null>> {
    try {
      const docRef = typedDoc<LearningObjective>(COLLECTIONS.LEARNING_OBJECTIVES, objectiveId);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        return { success: true, data: null };
      }
      return { success: true, data: snapshot.data() };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve learning objective',
      };
    }
  },

  /**
   * Updates an existing learning objective.
   */
  async updateObjective(
    objectiveId: string,
    updates: UpdateLearningObjectiveInput
  ): Promise<DbResult<void>> {
    try {
      const docRef = typedDoc<LearningObjective>(COLLECTIONS.LEARNING_OBJECTIVES, objectiveId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: nowTimestamp(),
      });
      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update learning objective',
      };
    }
  },

  /**
   * Deletes a learning objective.
   */
  async deleteObjective(objectiveId: string): Promise<DbResult<void>> {
    try {
      const docRef = typedDoc<LearningObjective>(COLLECTIONS.LEARNING_OBJECTIVES, objectiveId);
      await deleteDoc(docRef);
      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete learning objective',
      };
    }
  },
};
