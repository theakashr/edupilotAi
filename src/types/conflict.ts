/**
 * src/types/conflict.ts
 *
 * Phase 8: Source Trust & Conflict Resolution — Firestore document types.
 *
 * Design Principles:
 * - AI DOES NOT DECIDE WHICH SOURCE IS TRUE.
 * - AI recommends. Teacher decides.
 * - All conflicts remain in 'pending' status until a teacher explicitly resolves them.
 * - Provenance is always preserved: every field traces back to materialId + chunkId.
 */

import type { Timestamp } from 'firebase/firestore';

// ─── Source Trust Profile ─────────────────────────────────────────────────────

/**
 * Trust tier levels as defined by the teacher.
 *   'primary'   — Authoritative; preferred when conflicts arise (e.g., official textbook).
 *   'secondary' — Supplemental; useful but lower precedence than primary.
 *   'reference' — Background reading; lowest precedence.
 *
 * Precedence for conflict display: primary > secondary > reference
 */
export type TrustTier = 'primary' | 'secondary' | 'reference';

/**
 * Teacher-defined trust profile for a single material within a course.
 * One profile per (courseId, materialId) pair — enforced at the service layer.
 *
 * Immutable once created except via teacher action (updateSourceProfile).
 */
export interface SourceProfile {
  id: string;
  courseId: string;
  materialId: string;
  /** Human-readable title copied from the material at profile creation time (denormalized for display). */
  materialTitle: string;
  trustTier: TrustTier;
  /** Optional teacher-supplied rationale for the trust assignment (e.g., "Official curriculum book"). */
  rationale?: string;
  /** UID of the teacher who set this profile. */
  setBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Source Conflict ──────────────────────────────────────────────────────────

/**
 * Conflict severity assessed by Agnes.
 *   'low'      — Minor wording/emphasis difference; likely not pedagogically significant.
 *   'medium'   — Factual discrepancy worth a teacher review.
 *   'high'     — Contradictory facts that could confuse students; urgent review needed.
 */
export type ConflictSeverity = 'low' | 'medium' | 'high';

/**
 * Lifecycle of a detected conflict:
 *   'pending'         — Detected by AI, awaiting teacher review.
 *   'accepted'        — Teacher has reviewed and decided which source to trust.
 *   'dismissed'       — Teacher has reviewed and determined no real conflict exists.
 *   'needs_revision'  — Teacher has flagged the material itself for revision.
 */
export type ConflictStatus = 'pending' | 'accepted' | 'dismissed' | 'needs_revision';

/**
 * A single detected conflict between two source materials on a specific concept.
 *
 * Always involves exactly two materials (sourceA vs sourceB) — the AI identifies
 * the conflicting claims, the teacher decides which, if any, is authoritative.
 *
 * IMPORTANT: The conflict record is immutable after creation except for the
 * resolution fields (status, resolution, resolvedBy, resolvedAt).
 */
export interface SourceConflict {
  id: string;
  courseId: string;

  /** The concept or topic where the conflict was detected. */
  conceptId?: string;
  conceptName?: string;

  // ─── Source A ──────────────────────────────────────────────────────────────
  materialIdA: string;
  materialTitleA?: string;
  chunkIdA: string;
  pageNumberA?: number;
  /** Verbatim or lightly paraphrased claim extracted from source A. */
  claimA: string;

  // ─── Source B ──────────────────────────────────────────────────────────────
  materialIdB: string;
  materialTitleB?: string;
  chunkIdB: string;
  pageNumberB?: number;
  /** Verbatim or lightly paraphrased claim extracted from source B. */
  claimB: string;

  // ─── Agnes Analysis ────────────────────────────────────────────────────────
  /** AI-generated description of why these two claims conflict. */
  conflictSummary: string;
  /** AI-assessed severity — for teacher triage, not for autonomous decisions. */
  severity: ConflictSeverity;
  /** AI-reported confidence in the conflict detection (0–1). Uncalibrated LLM heuristic. */
  modelReportedConfidence?: number;
  /** AI pedagogical recommendation for teacher consideration. */
  pedagogicalNote?: string;

  // ─── Trust Context ─────────────────────────────────────────────────────────
  /** Snapshot of trust tier for material A at detection time (may change later). */
  trustTierA?: TrustTier;
  /** Snapshot of trust tier for material B at detection time (may change later). */
  trustTierB?: TrustTier;

  // ─── Resolution (set exclusively by teacher) ───────────────────────────────
  status: ConflictStatus;
  /**
   * Teacher's resolution note.
   * Required when status transitions to 'accepted', 'dismissed', or 'needs_revision'.
   */
  resolution?: string;
  /**
   * UID of the material the teacher designated as authoritative.
   * Only meaningful when status === 'accepted'.
   * null means teacher found both acceptable or neither is fully correct.
   */
  trustedMaterialId?: string | null;
  /** UID of the teacher who resolved. */
  resolvedBy?: string;
  resolvedAt?: Timestamp;

  // ─── Audit ─────────────────────────────────────────────────────────────────
  /** Agnes AI decision event ID referencing the audit trail. */
  aiDecisionEventId?: string;
  /** Agnes request ID for cross-referencing logs. */
  agnesRequestId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Teacher Resolution Input ─────────────────────────────────────────────────

/**
 * Payload from a teacher resolving a conflict.
 * Validated by resolveConflictSchema in lib/validation.
 */
export interface ResolveConflictInput {
  conflictId: string;
  status: Exclude<ConflictStatus, 'pending'>;
  resolution: string;
  trustedMaterialId?: string | null;
  teacherId: string;
}
