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
  conceptCollection,
  studentActivityCollection,
  learningGapCollection,
  learningPathCollection,
  learningPathItemCollection,
  typedDoc,
} from '@/lib/firebase/converters';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { nowTimestamp } from '@/lib/firebase/timestamps';
import type {
  Concept,
  StudentActivity,
  LearningProfile,
  LearningGap,
  LearningPath,
  LearningPathItem,
  DbResult,
} from '@/types';
import type {
  CreateConceptInput,
  UpdateConceptInput,
  CreateStudentActivityInput,
  UpdateLearningProfileInput,
  CreateLearningGapInput,
  UpdateLearningGapInput,
  CreateLearningPathInput,
  UpdateLearningPathInput,
  CreateLearningPathItemInput,
  UpdateLearningPathItemInput,
} from '@/lib/validation';

/**
 * Service managing learning intelligence, knowledge graph concepts, activity,
 * profiles, gap diagnosis, and adaptive paths.
 */
export const learningService = {
  // ─── Concepts ───────────────────────────────────────────────────────────────

  /**
   * Create a knowledge concept.
   */
  async createConcept(
    input: CreateConceptInput
  ): Promise<DbResult<Concept>> {
    try {
      const colRef = conceptCollection();
      const newDocRef = doc(colRef);
      const now = nowTimestamp();

      const newConcept: Concept = {
        id: newDocRef.id,
        courseId: input.courseId,
        name: input.name,
        description: input.description,
        difficulty: input.difficulty,
        prerequisiteConceptIds: input.prerequisiteConceptIds,
        materialIds: input.materialIds,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(newDocRef, newConcept);
      return { success: true, data: newConcept };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create concept',
      };
    }
  },

  /**
   * Get concept by ID.
   */
  async getConceptById(conceptId: string): Promise<DbResult<Concept | null>> {
    try {
      const docRef = typedDoc<Concept>(COLLECTIONS.CONCEPTS, conceptId);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        return { success: true, data: null };
      }
      return { success: true, data: snapshot.data() };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve concept',
      };
    }
  },

  /**
   * List all concepts for a course.
   */
  async listCourseConcepts(courseId: string): Promise<DbResult<Concept[]>> {
    try {
      const q = query(
        conceptCollection(),
        where('courseId', '==', courseId),
        orderBy('name', 'asc')
      );
      const snapshot = await getDocs(q);
      const concepts = snapshot.docs.map((d) => d.data());
      return { success: true, data: concepts };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list concepts',
      };
    }
  },

  /**
   * Update a concept.
   */
  async updateConcept(
    conceptId: string,
    updates: UpdateConceptInput
  ): Promise<DbResult<void>> {
    try {
      const docRef = typedDoc<Concept>(COLLECTIONS.CONCEPTS, conceptId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: nowTimestamp(),
      });
      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update concept',
      };
    }
  },

  // ─── Student Activity ──────────────────────────────────────────────────────

  /**
   * Log behavioral student activity signal.
   */
  async logStudentActivity(
    input: CreateStudentActivityInput
  ): Promise<DbResult<StudentActivity>> {
    try {
      const colRef = studentActivityCollection();
      const newDocRef = doc(colRef);

      const activity: StudentActivity = {
        id: newDocRef.id,
        studentId: input.studentId,
        courseId: input.courseId,
        activityType: input.activityType,
        referenceId: input.referenceId,
        metadata: input.metadata,
        timestamp: nowTimestamp(),
      };

      await setDoc(newDocRef, activity);
      return { success: true, data: activity };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to log student activity',
      };
    }
  },

  /**
   * List recent activities for a student in a course.
   */
  async listStudentActivities(
    studentId: string,
    courseId: string,
    maxCount = 50
  ): Promise<DbResult<StudentActivity[]>> {
    try {
      const q = query(
        studentActivityCollection(),
        where('studentId', '==', studentId),
        where('courseId', '==', courseId),
        orderBy('timestamp', 'desc'),
        limit(maxCount)
      );
      const snapshot = await getDocs(q);
      const activities = snapshot.docs.map((d) => d.data());
      return { success: true, data: activities };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list student activities',
      };
    }
  },

  // ─── Learning Profile ──────────────────────────────────────────────────────

  /**
   * Get learning profile for a student in a course.
   */
  async getLearningProfile(
    studentId: string,
    courseId: string
  ): Promise<DbResult<LearningProfile | null>> {
    try {
      const profileId = `${studentId}_${courseId}`;
      const docRef = typedDoc<LearningProfile>(
        COLLECTIONS.LEARNING_PROFILES,
        profileId
      );
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return { success: true, data: null };
      }

      return { success: true, data: snapshot.data() };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve learning profile',
      };
    }
  },

  /**
   * Upsert a learning profile.
   */
  async upsertLearningProfile(
    studentId: string,
    courseId: string,
    updates: UpdateLearningProfileInput
  ): Promise<DbResult<LearningProfile>> {
    try {
      const profileId = `${studentId}_${courseId}`;
      const docRef = typedDoc<LearningProfile>(
        COLLECTIONS.LEARNING_PROFILES,
        profileId
      );
      const snapshot = await getDoc(docRef);
      const now = nowTimestamp();

      if (snapshot.exists()) {
        await updateDoc(docRef, {
          ...updates,
          lastUpdatedAt: now,
        });
        const updated = await getDoc(docRef);
        return { success: true, data: updated.data()! };
      } else {
        const newProfile: LearningProfile = {
          id: profileId,
          studentId,
          courseId,
          preferredLanguage: updates.preferredLanguage || 'en',
          learningPreferences: updates.learningPreferences,
          overallMastery: updates.overallMastery ?? 0,
          lastUpdatedAt: now,
        };
        await setDoc(docRef, newProfile);
        return { success: true, data: newProfile };
      }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to upsert learning profile',
      };
    }
  },

  // ─── Learning Gaps ─────────────────────────────────────────────────────────

  /**
   * Create a learning gap record.
   */
  async createLearningGap(
    input: CreateLearningGapInput
  ): Promise<DbResult<LearningGap>> {
    try {
      const colRef = learningGapCollection();
      const newDocRef = doc(colRef);
      const now = nowTimestamp();

      const newGap: LearningGap = {
        id: newDocRef.id,
        studentId: input.studentId,
        courseId: input.courseId,
        conceptId: input.conceptId,
        currentMastery: input.currentMastery,
        riskLevel: input.riskLevel,
        predicted: input.predicted,
        reason: input.reason,
        evidence: input.evidence,
        status: input.status,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(newDocRef, newGap);
      return { success: true, data: newGap };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create learning gap',
      };
    }
  },

  /**
   * List learning gaps for a student in a course.
   */
  async listStudentGaps(
    studentId: string,
    courseId: string
  ): Promise<DbResult<LearningGap[]>> {
    try {
      const q = query(
        learningGapCollection(),
        where('studentId', '==', studentId),
        where('courseId', '==', courseId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const gaps = snapshot.docs.map((d) => d.data());
      return { success: true, data: gaps };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list learning gaps',
      };
    }
  },

  /**
   * Update a learning gap.
   */
  async updateLearningGap(
    gapId: string,
    updates: UpdateLearningGapInput
  ): Promise<DbResult<void>> {
    try {
      const docRef = typedDoc<LearningGap>(COLLECTIONS.LEARNING_GAPS, gapId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: nowTimestamp(),
      });
      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update learning gap',
      };
    }
  },

  // ─── Learning Paths & Items ────────────────────────────────────────────────

  /**
   * Create a learning path.
   */
  async createLearningPath(
    input: CreateLearningPathInput
  ): Promise<DbResult<LearningPath>> {
    try {
      const colRef = learningPathCollection();
      const newDocRef = doc(colRef);
      const now = nowTimestamp();

      const newPath: LearningPath = {
        id: newDocRef.id,
        studentId: input.studentId,
        courseId: input.courseId,
        title: input.title,
        status: input.status,
        generatedBy: input.generatedBy,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(newDocRef, newPath);
      return { success: true, data: newPath };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create learning path',
      };
    }
  },

  /**
   * Get learning path by ID.
   */
  async getLearningPathById(
    pathId: string
  ): Promise<DbResult<LearningPath | null>> {
    try {
      const docRef = typedDoc<LearningPath>(COLLECTIONS.LEARNING_PATHS, pathId);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        return { success: true, data: null };
      }
      return { success: true, data: snapshot.data() };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve learning path',
      };
    }
  },

  /**
   * List learning paths for a student in a course.
   */
  async listStudentPaths(
    studentId: string,
    courseId: string
  ): Promise<DbResult<LearningPath[]>> {
    try {
      const q = query(
        learningPathCollection(),
        where('studentId', '==', studentId),
        where('courseId', '==', courseId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const paths = snapshot.docs.map((d) => d.data());
      return { success: true, data: paths };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list learning paths',
      };
    }
  },

  /**
   * Update a learning path.
   */
  async updateLearningPath(
    pathId: string,
    updates: UpdateLearningPathInput
  ): Promise<DbResult<void>> {
    try {
      const docRef = typedDoc<LearningPath>(COLLECTIONS.LEARNING_PATHS, pathId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: nowTimestamp(),
      });
      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update learning path',
      };
    }
  },

  /**
   * Add an item to a learning path.
   */
  async createLearningPathItem(
    input: CreateLearningPathItemInput
  ): Promise<DbResult<LearningPathItem>> {
    try {
      const colRef = learningPathItemCollection();
      const newDocRef = doc(colRef);
      const now = nowTimestamp();

      const newItem: LearningPathItem = {
        id: newDocRef.id,
        learningPathId: input.learningPathId,
        studentId: input.studentId,
        courseId: input.courseId,
        order: input.order,
        conceptId: input.conceptId,
        activityType: input.activityType,
        referenceId: input.referenceId,
        status: input.status,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(newDocRef, newItem);
      return { success: true, data: newItem };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create path item',
      };
    }
  },

  /**
   * List all items for a learning path, sorted by order.
   */
  async listPathItems(
    learningPathId: string
  ): Promise<DbResult<LearningPathItem[]>> {
    try {
      const q = query(
        learningPathItemCollection(),
        where('learningPathId', '==', learningPathId),
        orderBy('order', 'asc')
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((d) => d.data());
      return { success: true, data: items };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list path items',
      };
    }
  },

  /**
   * Update a learning path item status or order.
   */
  async updateLearningPathItem(
    itemId: string,
    updates: UpdateLearningPathItemInput
  ): Promise<DbResult<void>> {
    try {
      const docRef = typedDoc<LearningPathItem>(
        COLLECTIONS.LEARNING_PATH_ITEMS,
        itemId
      );
      await updateDoc(docRef, {
        ...updates,
        updatedAt: nowTimestamp(),
      });
      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update path item',
      };
    }
  },
};
