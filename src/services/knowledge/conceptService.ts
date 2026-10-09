/**
 * src/services/knowledge/conceptService.ts
 *
 * Authoritative concept repository service for EduPilot AI.
 * Handles concept creation, updates, listing, duplicate checking, and safe deletion/archiving.
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
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  conceptCollection,
  conceptRelationshipCollection,
  learningObjectiveCollection,
  conceptSourceCollection,
  typedDoc,
} from '@/lib/firebase/converters';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { nowTimestamp } from '@/lib/firebase/timestamps';
import type { Concept, DbResult } from '@/types';
import type { CreateConceptInput, UpdateConceptInput } from '@/lib/validation';
import { normalizeConceptName } from './candidateExtractor';

export interface ConceptDependencies {
  relationshipsCount: number;
  prerequisitesCount: number;
  objectivesCount: number;
  totalReferences: number;
}

export const conceptService = {
  /**
   * Creates an authoritative educational concept.
   */
  async createConcept(input: CreateConceptInput): Promise<DbResult<Concept>> {
    try {
      const colRef = conceptCollection();
      const newDocRef = doc(colRef);
      const now = nowTimestamp();

      const newConcept: Concept = {
        id: newDocRef.id,
        courseId: input.courseId,
        name: input.name.trim(),
        description: input.description?.trim(),
        difficulty: input.difficulty ?? 5,
        prerequisiteConceptIds: input.prerequisiteConceptIds || [],
        materialIds: input.materialIds || [],
        status: input.status || 'active',
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
   * Retrieves a concept by ID.
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
   * Lists all concepts belonging to a course.
   */
  async listCourseConcepts(
    courseId: string,
    options?: { includeArchived?: boolean }
  ): Promise<DbResult<Concept[]>> {
    try {
      const q = query(
        conceptCollection(),
        where('courseId', '==', courseId)
      );
      const snapshot = await getDocs(q);
      let concepts = snapshot.docs.map((d) => d.data());
      
      // Sort manually to avoid FAILED_PRECONDITION on missing index
      concepts.sort((a, b) => a.name.localeCompare(b.name));

      if (!options?.includeArchived) {
        concepts = concepts.filter((c) => c.status !== 'archived');
      }

      return { success: true, data: concepts };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list concepts',
      };
    }
  },

  /**
   * Finds an existing concept in the course by normalized name to prevent duplicate creation.
   */
  async findDuplicateConcept(
    courseId: string,
    name: string
  ): Promise<DbResult<Concept | null>> {
    try {
      const listRes = await this.listCourseConcepts(courseId, { includeArchived: true });
      if (!listRes.success) {
        return { success: false, error: listRes.error };
      }
      if (!listRes.data) {
        return { success: false, error: 'Failed to check duplicates' };
      }

      const targetNorm = normalizeConceptName(name);
      const match = listRes.data.find(
        (c) => normalizeConceptName(c.name) === targetNorm
      );

      return { success: true, data: match || null };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to search for duplicate concept',
      };
    }
  },

  /**
   * Updates an existing concept.
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

  /**
   * Checks whether any other entity in the course depends on this concept.
   */
  async checkDependencies(
    conceptId: string,
    courseId: string
  ): Promise<DbResult<ConceptDependencies>> {
    try {
      // 1. Check prerequisiteConceptIds on other concepts in the course
      const conceptsRes = await this.listCourseConcepts(courseId, { includeArchived: true });
      let prerequisitesCount = 0;
      if (conceptsRes.success && conceptsRes.data) {
        for (const c of conceptsRes.data) {
          if (c.id !== conceptId && c.prerequisiteConceptIds?.includes(conceptId)) {
            prerequisitesCount++;
          }
        }
      }

      // 2. Check concept_relationships where concept is source or target
      const relQ1 = query(
        conceptRelationshipCollection(),
        where('courseId', '==', courseId),
        where('sourceConceptId', '==', conceptId)
      );
      const relQ2 = query(
        conceptRelationshipCollection(),
        where('courseId', '==', courseId),
        where('targetConceptId', '==', conceptId)
      );
      const [relSnap1, relSnap2] = await Promise.all([getDocs(relQ1), getDocs(relQ2)]);
      const relationshipsCount = relSnap1.size + relSnap2.size;

      // 3. Check learning_objectives
      const objQ = query(
        learningObjectiveCollection(),
        where('courseId', '==', courseId),
        where('conceptIds', 'array-contains', conceptId)
      );
      const objSnap = await getDocs(objQ);
      const objectivesCount = objSnap.size;

      const totalReferences = prerequisitesCount + relationshipsCount + objectivesCount;

      return {
        success: true,
        data: {
          relationshipsCount,
          prerequisitesCount,
          objectivesCount,
          totalReferences,
        },
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to check concept dependencies',
      };
    }
  },

  /**
   * Safely deletes or archives a concept depending on whether references exist.
   * If dependencies exist, safely archives the concept to preserve referential integrity.
   */
  async safeDeleteOrArchiveConcept(
    conceptId: string,
    courseId: string,
    forceDelete: boolean = false
  ): Promise<DbResult<{ actionTaken: 'archived' | 'deleted'; dependencies?: ConceptDependencies }>> {
    try {
      const depRes = await this.checkDependencies(conceptId, courseId);
      const dependencies = depRes.success && depRes.data
        ? depRes.data
        : { relationshipsCount: 0, prerequisitesCount: 0, objectivesCount: 0, totalReferences: 0 };

      // If dependencies exist and not forced, archive to protect referential integrity
      if (dependencies.totalReferences > 0 && !forceDelete) {
        const updateRes = await this.updateConcept(conceptId, { status: 'archived' });
        if (!updateRes.success) {
          return { success: false, error: updateRes.error };
        }
        return {
          success: true,
          data: { actionTaken: 'archived', dependencies },
        };
      }

      // Hard delete: remove concept document and associated source citations
      const docRef = typedDoc<Concept>(COLLECTIONS.CONCEPTS, conceptId);
      await deleteDoc(docRef);

      // Clean up concept_sources for this concept
      const sourcesQ = query(
        conceptSourceCollection(),
        where('conceptId', '==', conceptId)
      );
      const sourcesSnap = await getDocs(sourcesQ);
      if (!sourcesSnap.empty) {
        const batch = writeBatch(db);
        for (const sDoc of sourcesSnap.docs) {
          batch.delete(sDoc.ref);
        }
        await batch.commit();
      }

      return {
        success: true,
        data: { actionTaken: 'deleted', dependencies },
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete or archive concept',
      };
    }
  },
};
