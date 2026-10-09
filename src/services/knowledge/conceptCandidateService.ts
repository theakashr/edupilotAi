/**
 * src/services/knowledge/conceptCandidateService.ts
 *
 * Candidate concept lifecycle service for EduPilot AI Phase 6.
 * Manages deterministic candidate extraction, pending review queue,
 * teacher approvals, edits, and rejections.
 */

import {
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  doc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { conceptCandidateCollection, typedDoc } from '@/lib/firebase/converters';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { nowTimestamp } from '@/lib/firebase/timestamps';
import type { Concept, ConceptCandidate, ConceptCandidateStatus, DbResult, MaterialChunk } from '@/types';
import type { ReviewCandidateInput } from '@/lib/validation';
import { extractConceptCandidates, normalizeConceptName } from './candidateExtractor';
import { conceptService } from './conceptService';
import { conceptSourceService } from './conceptSourceService';

export const conceptCandidateService = {
  /**
   * Deterministically extracts concept candidates from material chunks and saves them to Firestore.
   * Checks for existing candidates and existing approved concepts to avoid duplicate clutter.
   */
  async extractAndSaveCandidates(
    courseId: string,
    materialId: string,
    chunks: MaterialChunk[]
  ): Promise<DbResult<{ totalExtracted: number; newSaved: number; candidates: ConceptCandidate[] }>> {
    try {
      if (!chunks || chunks.length === 0) {
        return { success: true, data: { totalExtracted: 0, newSaved: 0, candidates: [] } };
      }

      // 1. Run deterministic rule-based extractor
      const extracted = extractConceptCandidates(chunks);
      if (extracted.length === 0) {
        return { success: true, data: { totalExtracted: 0, newSaved: 0, candidates: [] } };
      }

      // 2. Fetch existing candidates for this course to ensure idempotency
      const existingCandQ = query(
        conceptCandidateCollection(),
        where('courseId', '==', courseId)
      );
      const existingCandSnap = await getDocs(existingCandQ);
      const existingCandMap = new Map<string, ConceptCandidate>();
      for (const d of existingCandSnap.docs) {
        const c = d.data();
        existingCandMap.set(c.normalizedName, c);
      }

      // 3. Fetch existing approved concepts to detect duplicates
      const conceptsRes = await conceptService.listCourseConcepts(courseId, { includeArchived: true });
      const existingConceptMap = new Map<string, Concept>();
      if (conceptsRes.success && conceptsRes.data) {
        for (const conc of conceptsRes.data) {
          existingConceptMap.set(normalizeConceptName(conc.name), conc);
        }
      }

      // 4. Prepare batch writes for new candidates
      const now = nowTimestamp();
      const colRef = conceptCandidateCollection();
      const candidatesToSave: ConceptCandidate[] = [];
      const batch = writeBatch(db);

      for (const item of extracted) {
        const existingCand = existingCandMap.get(item.normalizedName);

        // If candidate already exists for this course, update its chunks/pages if needed without overwriting status
        if (existingCand) {
          continue; // Already queued or processed
        }

        const newDocRef = doc(colRef);
        const duplicateConcept = existingConceptMap.get(item.normalizedName);

        const candidate: ConceptCandidate = {
          id: newDocRef.id,
          courseId,
          materialId,
          name: item.name,
          normalizedName: item.normalizedName,
          description: item.description,
          sourceChunkIds: item.sourceChunkIds,
          sourcePages: item.sourcePages,
          relevanceScore: item.relevanceScore,
          scoringSignals: item.scoringSignals,
          duplicateOfConceptId: duplicateConcept ? duplicateConcept.id : undefined,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        };

        batch.set(newDocRef, candidate);
        candidatesToSave.push(candidate);
      }

      if (candidatesToSave.length > 0) {
        await batch.commit();
      }

      return {
        success: true,
        data: {
          totalExtracted: extracted.length,
          newSaved: candidatesToSave.length,
          candidates: candidatesToSave,
        },
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to extract and save concept candidates',
      };
    }
  },

  /**
   * Lists candidates for a course, optionally filtered by status.
   */
  async listCourseCandidates(
    courseId: string,
    status?: ConceptCandidateStatus
  ): Promise<DbResult<ConceptCandidate[]>> {
    try {
      const q = query(
        conceptCandidateCollection(),
        where('courseId', '==', courseId)
      );

      const snapshot = await getDocs(q);
      let candidates = snapshot.docs.map((d) => d.data());

      // Sort manually since composite index (courseId, relevanceScore) might not be deployed
      candidates.sort((a, b) => b.relevanceScore - a.relevanceScore);

      if (status) {
        candidates = candidates.filter((c) => c.status === status);
      }

      return { success: true, data: candidates };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list concept candidates',
      };
    }
  },

  /**
   * Retrieves a single candidate by ID.
   */
  async getCandidateById(
    candidateId: string
  ): Promise<DbResult<ConceptCandidate | null>> {
    try {
      const docRef = typedDoc<ConceptCandidate>(COLLECTIONS.CONCEPT_CANDIDATES, candidateId);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        return { success: true, data: null };
      }
      return { success: true, data: snapshot.data() };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve candidate',
      };
    }
  },

  /**
   * Teacher review workflow: Approve or Reject a concept candidate.
   * If approved: creates authoritative Concept and fine-grained source references.
   * If rejected: updates candidate status to rejected without creating Concept.
   */
  async reviewCandidate(
    input: ReviewCandidateInput,
    reviewerId: string
  ): Promise<DbResult<{ candidate: ConceptCandidate; concept?: Concept }>> {
    try {
      const candRes = await this.getCandidateById(input.candidateId);
      if (!candRes.success) {
        return { success: false, error: candRes.error };
      }
      if (!candRes.data) {
        return { success: false, error: 'Candidate not found' };
      }

      const candidate = candRes.data;
      const now = nowTimestamp();

      if (input.status === 'rejected') {
        const docRef = typedDoc<ConceptCandidate>(COLLECTIONS.CONCEPT_CANDIDATES, candidate.id);
        await updateDoc(docRef, {
          status: 'rejected',
          reviewedBy: reviewerId,
          reviewedAt: now,
          updatedAt: now,
        });

        const updatedCand: ConceptCandidate = {
          ...candidate,
          status: 'rejected',
          reviewedBy: reviewerId,
          reviewedAt: now,
          updatedAt: now,
        };

        return { success: true, data: { candidate: updatedCand } };
      }

      // Status is 'approved'
      const finalName = input.customName?.trim() || candidate.name;
      const finalDesc = input.customDescription?.trim() || candidate.description;
      const finalDifficulty = input.customDifficulty ?? 5;

      // 1. Create the authoritative concept document
      const conceptCreateRes = await conceptService.createConcept({
        courseId: candidate.courseId,
        name: finalName,
        description: finalDesc,
        difficulty: finalDifficulty,
        materialIds: [candidate.materialId],
      });

      if (!conceptCreateRes.success) {
        return { success: false, error: conceptCreateRes.error };
      }
      if (!conceptCreateRes.data) {
        return { success: false, error: 'Failed to create authoritative concept' };
      }

      const newConcept = conceptCreateRes.data;

      // 2. Create fine-grained source references
      if (candidate.sourceChunkIds.length > 0) {
        const sourceInputs = candidate.sourceChunkIds.map((chunkId, idx) => ({
          conceptId: newConcept.id,
          courseId: candidate.courseId,
          materialId: candidate.materialId,
          materialChunkId: chunkId,
          pageNumber: candidate.sourcePages[idx] || candidate.sourcePages[0] || 1,
          evidenceText: candidate.description?.slice(0, 300),
        }));

        await conceptSourceService.batchCreateSourceReferences(sourceInputs);
      }

      // 3. Mark candidate as approved and link conceptId
      const candRef = typedDoc<ConceptCandidate>(COLLECTIONS.CONCEPT_CANDIDATES, candidate.id);
      await updateDoc(candRef, {
        status: 'approved',
        conceptId: newConcept.id,
        reviewedBy: reviewerId,
        reviewedAt: now,
        updatedAt: now,
      });

      const updatedCand: ConceptCandidate = {
        ...candidate,
        status: 'approved',
        conceptId: newConcept.id,
        reviewedBy: reviewerId,
        reviewedAt: now,
        updatedAt: now,
      };

      return {
        success: true,
        data: {
          candidate: updatedCand,
          concept: newConcept,
        },
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to process candidate review',
      };
    }
  },

  /**
   * Deletes a concept candidate from the review queue.
   */
  async deleteCandidate(candidateId: string): Promise<DbResult<void>> {
    try {
      const docRef = typedDoc<ConceptCandidate>(COLLECTIONS.CONCEPT_CANDIDATES, candidateId);
      await deleteDoc(docRef);
      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete candidate',
      };
    }
  },
};
