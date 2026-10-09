/**
 * src/services/knowledge/conceptSourceService.ts
 *
 * Source reference tracking service for EduPilot AI Phase 6.
 * Provides fine-grained provenance linking concepts to specific material chunks and pages.
 */

import {
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  doc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { conceptSourceCollection, typedDoc } from '@/lib/firebase/converters';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { nowTimestamp } from '@/lib/firebase/timestamps';
import type { ConceptSourceReference, DbResult } from '@/types';
import type { CreateConceptSourceInput } from '@/lib/validation';

export const conceptSourceService = {
  /**
   * Registers a source reference linking a concept to a material chunk.
   */
  async createSourceReference(
    input: CreateConceptSourceInput
  ): Promise<DbResult<ConceptSourceReference>> {
    try {
      const colRef = conceptSourceCollection();
      const newDocRef = doc(colRef);
      const now = nowTimestamp();

      const newRef: ConceptSourceReference = {
        id: newDocRef.id,
        conceptId: input.conceptId,
        courseId: input.courseId,
        materialId: input.materialId,
        materialChunkId: input.materialChunkId,
        pageNumber: input.pageNumber,
        evidenceText: input.evidenceText?.slice(0, 300),
        createdAt: now,
      };

      await setDoc(newDocRef, newRef);
      return { success: true, data: newRef };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to register source reference',
      };
    }
  },

  /**
   * Batch creates multiple source references for an approved concept.
   */
  async batchCreateSourceReferences(
    inputs: CreateConceptSourceInput[]
  ): Promise<DbResult<number>> {
    try {
      if (inputs.length === 0) return { success: true, data: 0 };

      const now = nowTimestamp();
      const colRef = conceptSourceCollection();
      const BATCH_SIZE = 450;
      let totalCreated = 0;

      for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const slice = inputs.slice(i, i + BATCH_SIZE);

        for (const input of slice) {
          const newDocRef = doc(colRef);
          const newRef: ConceptSourceReference = {
            id: newDocRef.id,
            conceptId: input.conceptId,
            courseId: input.courseId,
            materialId: input.materialId,
            materialChunkId: input.materialChunkId,
            pageNumber: input.pageNumber,
            evidenceText: input.evidenceText?.slice(0, 300),
            createdAt: now,
          };
          batch.set(newDocRef, newRef);
          totalCreated++;
        }

        await batch.commit();
      }

      return { success: true, data: totalCreated };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to batch save source references',
      };
    }
  },

  /**
   * Retrieves all source references supporting a specific concept.
   */
  async listSourcesByConcept(
    conceptId: string
  ): Promise<DbResult<ConceptSourceReference[]>> {
    try {
      const q = query(
        conceptSourceCollection(),
        where('conceptId', '==', conceptId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const sources = snapshot.docs.map((d) => d.data());
      return { success: true, data: sources };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list concept source references',
      };
    }
  },

  /**
   * Retrieves all source references for a course.
   */
  async listSourcesByCourse(
    courseId: string
  ): Promise<DbResult<ConceptSourceReference[]>> {
    try {
      const q = query(
        conceptSourceCollection(),
        where('courseId', '==', courseId)
      );
      const snapshot = await getDocs(q);
      const sources = snapshot.docs.map((d) => d.data());
      return { success: true, data: sources };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list course source references',
      };
    }
  },

  /**
   * Deletes a specific source reference.
   */
  async deleteSourceReference(sourceId: string): Promise<DbResult<void>> {
    try {
      const docRef = typedDoc<ConceptSourceReference>(COLLECTIONS.CONCEPT_SOURCES, sourceId);
      await deleteDoc(docRef);
      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete source reference',
      };
    }
  },
};
