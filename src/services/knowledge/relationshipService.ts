/**
 * src/services/knowledge/relationshipService.ts
 *
 * Concept relationship graph service for EduPilot AI Phase 6.
 * Manages directed relationships (prerequisite, related, part_of).
 * Enforces strict course scoping: cross-course links are categorically rejected.
 */

import {
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  doc,
} from 'firebase/firestore';
import { conceptRelationshipCollection, typedDoc } from '@/lib/firebase/converters';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { nowTimestamp } from '@/lib/firebase/timestamps';
import type { ConceptRelationship, DbResult } from '@/types';
import type { CreateConceptRelationshipInput } from '@/lib/validation';
import { conceptService } from './conceptService';

export const relationshipService = {
  /**
   * Creates a directed relationship between two concepts in the course.
   *
   * Example:
   * source Concept A (Arrays) --[prerequisite]--> target Concept B (Pointers)
   * Meaning: Arrays is a prerequisite for Pointers.
   */
  async createRelationship(
    input: CreateConceptRelationshipInput
  ): Promise<DbResult<ConceptRelationship>> {
    try {
      if (input.sourceConceptId === input.targetConceptId) {
        return { success: false, error: 'A concept cannot relate to itself' };
      }

      // 1. Fetch source and target concepts
      const [sourceRes, targetRes] = await Promise.all([
        conceptService.getConceptById(input.sourceConceptId),
        conceptService.getConceptById(input.targetConceptId),
      ]);

      if (!sourceRes.success || !sourceRes.data) {
        return { success: false, error: 'Source concept not found' };
      }
      if (!targetRes.success || !targetRes.data) {
        return { success: false, error: 'Target concept not found' };
      }

      const source = sourceRes.data;
      const target = targetRes.data;

      // 2. Strict Cross-Course Validation
      if (source.courseId !== input.courseId || target.courseId !== input.courseId) {
        return {
          success: false,
          error: 'Cross-course relationships are strictly prohibited. Both concepts must belong to the specified course.',
        };
      }

      // 3. Check for existing identical relationship
      const existingQ = query(
        conceptRelationshipCollection(),
        where('courseId', '==', input.courseId),
        where('sourceConceptId', '==', input.sourceConceptId),
        where('targetConceptId', '==', input.targetConceptId),
        where('type', '==', input.type)
      );
      const existingSnap = await getDocs(existingQ);
      if (!existingSnap.empty) {
        return { success: false, error: 'This relationship already exists' };
      }

      // 4. Create relationship document
      const colRef = conceptRelationshipCollection();
      const newDocRef = doc(colRef);
      const now = nowTimestamp();

      const newRel: ConceptRelationship = {
        id: newDocRef.id,
        courseId: input.courseId,
        sourceConceptId: input.sourceConceptId,
        targetConceptId: input.targetConceptId,
        type: input.type,
        description: input.description?.trim(),
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(newDocRef, newRel);

      // 5. If type is 'prerequisite', sync prerequisiteConceptIds on target Concept for backward compatibility
      if (input.type === 'prerequisite') {
        const existingPrereqs = target.prerequisiteConceptIds || [];
        if (!existingPrereqs.includes(input.sourceConceptId)) {
          await conceptService.updateConcept(target.id, {
            prerequisiteConceptIds: [...existingPrereqs, input.sourceConceptId],
          });
        }
      }

      return { success: true, data: newRel };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create concept relationship',
      };
    }
  },

  /**
   * Lists all relationships for a course.
   */
  async listCourseRelationships(
    courseId: string
  ): Promise<DbResult<ConceptRelationship[]>> {
    try {
      const q = query(
        conceptRelationshipCollection(),
        where('courseId', '==', courseId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const relationships = snapshot.docs.map((d) => d.data());
      return { success: true, data: relationships };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list concept relationships',
      };
    }
  },

  /**
   * Retrieves a single relationship by ID.
   */
  async getRelationshipById(
    relationshipId: string
  ): Promise<DbResult<ConceptRelationship | null>> {
    try {
      const docRef = typedDoc<ConceptRelationship>(COLLECTIONS.CONCEPT_RELATIONSHIPS, relationshipId);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        return { success: true, data: null };
      }
      return { success: true, data: snapshot.data() };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve relationship',
      };
    }
  },

  /**
   * Deletes a concept relationship and synchronizes prerequisite IDs if applicable.
   */
  async deleteRelationship(relationshipId: string): Promise<DbResult<void>> {
    try {
      const relRes = await this.getRelationshipById(relationshipId);
      if (!relRes.success) {
        return { success: false, error: relRes.error };
      }
      if (!relRes.data) {
        return { success: false, error: 'Relationship not found' };
      }

      const rel = relRes.data;

      // If prerequisite, remove sourceConceptId from target's prerequisiteConceptIds
      if (rel.type === 'prerequisite') {
        const targetRes = await conceptService.getConceptById(rel.targetConceptId);
        if (targetRes.success && targetRes.data) {
          const updatedPrereqs = (targetRes.data.prerequisiteConceptIds || []).filter(
            (id) => id !== rel.sourceConceptId
          );
          await conceptService.updateConcept(targetRes.data.id, {
            prerequisiteConceptIds: updatedPrereqs,
          });
        }
      }

      const docRef = typedDoc<ConceptRelationship>(COLLECTIONS.CONCEPT_RELATIONSHIPS, relationshipId);
      await deleteDoc(docRef);

      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete relationship',
      };
    }
  },
};
