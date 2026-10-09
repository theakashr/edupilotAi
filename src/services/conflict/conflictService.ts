/**
 * src/services/conflict/conflictService.ts
 *
 * Phase 8: Source Trust & Conflict Resolution — Firestore CRUD service.
 *
 * Responsibilities:
 * - Manage source trust profiles (teacher-defined per material per course)
 * - Persist AI-detected conflicts to Firestore
 * - Enforce the teacher review gate: only teachers can resolve conflicts
 * - Never read or write cross-course data
 *
 * Architecture constraint:
 * - AI DOES NOT DECIDE WHICH SOURCE IS TRUE.
 * - Conflicts always start 'pending' and require explicit teacher action to resolve.
 */

import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import {
  sourceProfileCollection,
  sourceConflictCollection,
  typedDoc,
} from '@/lib/firebase/converters';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { nowTimestamp } from '@/lib/firebase/timestamps';
import type {
  SourceProfile,
  SourceConflict,
  ConflictStatus,
  ConflictSeverity,
  TrustTier,
  DbResult,
} from '@/types';
import type {
  CreateSourceProfileInput,
  UpdateSourceProfileInput,
} from '@/lib/validation';

// ─── Source Trust Profile Operations ─────────────────────────────────────────

export const conflictService = {
  // ─── Source Profiles ───────────────────────────────────────────────────────

  /**
   * Create or update the trust profile for a material within a course.
   * Enforces one profile per (courseId, materialId) pair using a composite document ID.
   */
  async upsertSourceProfile(
    input: CreateSourceProfileInput
  ): Promise<DbResult<SourceProfile>> {
    try {
      // Composite ID ensures uniqueness: one profile per material per course
      const profileId = `${input.courseId}__${input.materialId}`;
      const docRef = typedDoc<SourceProfile>(COLLECTIONS.SOURCE_PROFILES, profileId);
      const now = nowTimestamp();

      const existingSnap = await getDoc(docRef);
      if (existingSnap.exists()) {
        // Update existing profile
        const existing = existingSnap.data();
        const updated: SourceProfile = {
          ...existing,
          trustTier: input.trustTier,
          rationale: input.rationale,
          setBy: input.setBy,
          updatedAt: now,
        };
        await setDoc(docRef, updated);
        return { success: true, data: updated };
      }

      // Create new profile
      const profile: SourceProfile = {
        id: profileId,
        courseId: input.courseId,
        materialId: input.materialId,
        materialTitle: input.materialTitle,
        trustTier: input.trustTier,
        rationale: input.rationale,
        setBy: input.setBy,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(docRef, profile);
      return { success: true, data: profile };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to upsert source profile',
      };
    }
  },

  /**
   * Get the source trust profile for a specific material in a course.
   * Returns null if no profile has been set.
   */
  async getSourceProfile(
    courseId: string,
    materialId: string
  ): Promise<DbResult<SourceProfile | null>> {
    try {
      const profileId = `${courseId}__${materialId}`;
      const docRef = typedDoc<SourceProfile>(COLLECTIONS.SOURCE_PROFILES, profileId);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        return { success: true, data: null };
      }
      return { success: true, data: snap.data() };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to get source profile',
      };
    }
  },

  /**
   * List all source trust profiles for a course.
   */
  async listCourseSourceProfiles(courseId: string): Promise<DbResult<SourceProfile[]>> {
    try {
      const q = query(
        sourceProfileCollection(),
        where('courseId', '==', courseId),
        orderBy('updatedAt', 'desc')
      );
      const snap = await getDocs(q);
      const profiles = snap.docs.map((d) => d.data());
      return { success: true, data: profiles };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list source profiles',
      };
    }
  },

  /**
   * Update the trust tier or rationale for an existing source profile.
   */
  async updateSourceProfile(
    courseId: string,
    materialId: string,
    input: UpdateSourceProfileInput,
    teacherId: string
  ): Promise<DbResult<void>> {
    try {
      const profileId = `${courseId}__${materialId}`;
      const docRef = typedDoc<SourceProfile>(COLLECTIONS.SOURCE_PROFILES, profileId);

      await updateDoc(docRef, {
        ...(input.trustTier !== undefined && { trustTier: input.trustTier }),
        ...(input.rationale !== undefined && { rationale: input.rationale }),
        setBy: teacherId,
        updatedAt: nowTimestamp(),
      });

      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update source profile',
      };
    }
  },

  /**
   * Delete a source trust profile.
   * Called when a teacher wants to remove the trust assignment for a material.
   */
  async deleteSourceProfile(
    courseId: string,
    materialId: string
  ): Promise<DbResult<void>> {
    try {
      const profileId = `${courseId}__${materialId}`;
      const docRef = typedDoc<SourceProfile>(COLLECTIONS.SOURCE_PROFILES, profileId);
      await deleteDoc(docRef);
      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete source profile',
      };
    }
  },

  // ─── Source Conflicts ──────────────────────────────────────────────────────

  /**
   * Persist an AI-detected conflict to Firestore.
   * Status is always initialized to 'pending' — teacher must resolve.
   */
  async createConflict(input: {
    courseId: string;
    conceptId?: string;
    conceptName?: string;
    materialIdA: string;
    materialTitleA?: string;
    chunkIdA: string;
    pageNumberA?: number;
    claimA: string;
    materialIdB: string;
    materialTitleB?: string;
    chunkIdB: string;
    pageNumberB?: number;
    claimB: string;
    conflictSummary: string;
    severity: ConflictSeverity;
    modelReportedConfidence?: number;
    pedagogicalNote?: string;
    trustTierA?: TrustTier;
    trustTierB?: TrustTier;
    aiDecisionEventId?: string;
    agnesRequestId?: string;
  }): Promise<DbResult<SourceConflict>> {
    try {
      const colRef = sourceConflictCollection();
      const newDocRef = doc(colRef);
      const now = nowTimestamp();

      const conflict: SourceConflict = {
        id: newDocRef.id,
        courseId: input.courseId,
        conceptId: input.conceptId,
        conceptName: input.conceptName,
        materialIdA: input.materialIdA,
        materialTitleA: input.materialTitleA,
        chunkIdA: input.chunkIdA,
        pageNumberA: input.pageNumberA,
        claimA: input.claimA,
        materialIdB: input.materialIdB,
        materialTitleB: input.materialTitleB,
        chunkIdB: input.chunkIdB,
        pageNumberB: input.pageNumberB,
        claimB: input.claimB,
        conflictSummary: input.conflictSummary,
        severity: input.severity,
        modelReportedConfidence: input.modelReportedConfidence,
        pedagogicalNote: input.pedagogicalNote,
        trustTierA: input.trustTierA,
        trustTierB: input.trustTierB,
        status: 'pending',
        aiDecisionEventId: input.aiDecisionEventId,
        agnesRequestId: input.agnesRequestId,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(newDocRef, conflict);
      return { success: true, data: conflict };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create conflict record',
      };
    }
  },

  /**
   * Get a single conflict by ID.
   */
  async getConflictById(conflictId: string): Promise<DbResult<SourceConflict | null>> {
    try {
      const docRef = typedDoc<SourceConflict>(COLLECTIONS.SOURCE_CONFLICTS, conflictId);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        return { success: true, data: null };
      }
      return { success: true, data: snap.data() };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to get conflict',
      };
    }
  },

  /**
   * List all conflicts for a course, optionally filtered by status.
   * Results are ordered by severity then creation date for triage convenience.
   */
  async listCourseConflicts(
    courseId: string,
    options?: {
      statusFilter?: ConflictStatus;
      maxCount?: number;
    }
  ): Promise<DbResult<SourceConflict[]>> {
    try {
      const max = options?.maxCount ?? 100;

      const q = options?.statusFilter
        ? query(
            sourceConflictCollection(),
            where('courseId', '==', courseId),
            where('status', '==', options.statusFilter),
            orderBy('createdAt', 'desc'),
            limit(max)
          )
        : query(
            sourceConflictCollection(),
            where('courseId', '==', courseId),
            orderBy('createdAt', 'desc'),
            limit(max)
          );

      const snap = await getDocs(q);
      const conflicts = snap.docs.map((d) => d.data());
      return { success: true, data: conflicts };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to list conflicts',
      };
    }
  },

  /**
   * Teacher resolves a conflict.
   *
   * HUMAN-IN-THE-LOOP ENFORCEMENT:
   * - This is the ONLY path to change a conflict out of 'pending'.
   * - The service layer does not validate teacher ownership — that must be
   *   enforced at the API route layer before calling this function.
   * - AI cannot call this function.
   */
  async resolveConflict(
    conflictId: string,
    resolution: {
      status: Exclude<ConflictStatus, 'pending'>;
      resolution: string;
      trustedMaterialId?: string | null;
      teacherId: string;
    }
  ): Promise<DbResult<void>> {
    try {
      const docRef = typedDoc<SourceConflict>(COLLECTIONS.SOURCE_CONFLICTS, conflictId);

      await updateDoc(docRef, {
        status: resolution.status,
        resolution: resolution.resolution,
        ...(resolution.trustedMaterialId !== undefined && {
          trustedMaterialId: resolution.trustedMaterialId,
        }),
        resolvedBy: resolution.teacherId,
        resolvedAt: nowTimestamp(),
        updatedAt: nowTimestamp(),
      });

      return { success: true, data: undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to resolve conflict',
      };
    }
  },

  /**
   * Count pending conflicts for a course (used for dashboard badges).
   */
  async countPendingConflicts(courseId: string): Promise<DbResult<number>> {
    try {
      const q = query(
        sourceConflictCollection(),
        where('courseId', '==', courseId),
        where('status', '==', 'pending')
      );
      const snap = await getDocs(q);
      return { success: true, data: snap.size };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to count pending conflicts',
      };
    }
  },
};
