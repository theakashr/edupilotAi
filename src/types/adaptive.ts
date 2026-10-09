/**
 * src/types/adaptive.ts
 *
 * Phase 10: Adaptive Learning Engine Types
 * Defines data structures for mastery estimation, knowledge graph gap diagnosis,
 * prioritized learning plans, dynamic replanning, and teacher interventions.
 */

import type { Timestamp } from 'firebase/firestore';
import type { ConceptDiagnosticStatus } from './assessment';
import type { RiskLevel, GapStatus, LearningPathItemActivity, LearningPathItemStatus } from './learning';

export type MasteryConfidence = 'insufficient' | 'low' | 'moderate' | 'high';

/**
 * Concept-level deterministic mastery estimate.
 */
export interface ConceptMasteryEstimate {
  conceptId: string;
  conceptName: string;
  /** Estimated mastery score 0–100 */
  score: number;
  confidence: MasteryConfidence;
  /** Total number of questions or graded signals evaluated */
  evaluatedQuestions: number;
  /** Number of correct answers */
  correctQuestions: number;
  /** Categorical status aligned with diagnostic assessment baseline */
  status: ConceptDiagnosticStatus;
  /** Chronological supporting evidence snippets */
  evidence: string[];
  /** Recency weighting factor applied (e.g. 1.0 for latest, 0.8 for prior) */
  recencyFactor: number;
  lastAssessedAt?: Timestamp | string;
}

/**
 * Aggregate student course-level mastery profile.
 */
export interface StudentCourseMasteryProfile {
  studentId: string;
  courseId: string;
  /** Overall average weighted mastery score 0–100 */
  overallMastery: number;
  totalConcepts: number;
  evaluatedConcepts: number;
  masteries: Record<string, ConceptMasteryEstimate>;
  lastCalculatedAt: Timestamp | string;
}

/**
 * Learning gap identified using the concept graph and evidence.
 */
export interface IdentifiedLearningGap {
  id?: string;
  conceptId: string;
  conceptName: string;
  currentMastery: number;
  riskLevel: RiskLevel;
  status: GapStatus;
  reason: string;
  evidence: string[];
  /** True if gap was derived from a missing or struggling prerequisite */
  isPrerequisiteGap: boolean;
  /** If prerequisite gap, the downstream concept that is blocked */
  blockedConceptId?: string;
  blockedConceptName?: string;
  /** If downstream gap, the upstream prerequisite that caused the block */
  rootPrerequisiteConceptId?: string;
  rootPrerequisiteConceptName?: string;
}

/**
 * Prioritized adaptive activity recommendation.
 */
export interface AdaptiveActivity {
  id: string;
  order: number;
  conceptId: string;
  conceptName: string;
  activityType: LearningPathItemActivity;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  reason: string;
  evidence: string[];
  /** Reference to real course Material or Assessment */
  referenceId?: string;
  resourceTitle?: string;
  resourceType?: string;
  resourceAvailable: boolean;
  isPrerequisiteReinforcement: boolean;
  prerequisiteInfo?: string;
  status: LearningPathItemStatus;
}

/**
 * Full adaptive learning plan for a student.
 */
export interface AdaptivePlanResult {
  pathId: string;
  studentId: string;
  courseId: string;
  title: string;
  status: string;
  overallMastery: number;
  activities: AdaptiveActivity[];
  gaps: IdentifiedLearningGap[];
  replannedAt: string;
  reasonSummary: string;
}

/**
 * Teacher-facing student diagnostic & gap summary.
 */
export interface StudentGapSummary {
  studentId: string;
  studentName: string;
  studentEmail: string;
  overallMastery: number;
  confidence: MasteryConfidence;
  activeGapCount: number;
  resolvedGapCount: number;
  strugglingConcepts: Array<{
    conceptId: string;
    conceptName: string;
    score: number;
    riskLevel: RiskLevel;
    evidence: string[];
  }>;
  needsDiagnostic: boolean;
  lastAttemptAt?: Timestamp | string;
}
